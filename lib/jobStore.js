import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')
const runtimeDir = path.join(rootDir, 'runtime')
const jobsPath = path.join(runtimeDir, 'jobs.json')
const OPEN_STATUSES = new Set(['queued', 'running', 'active', 'paused', 'blocked', 'paused_provider_blocked', 'recoverable_stale'])
const CLOSED_STATUSES = new Set(['complete', 'completed', 'failed', 'cancelled', 'archived'])
const LIVE_STATUS_CLASS = new Set(['queued', 'running', 'active', 'paused', 'blocked', 'paused_provider_blocked', 'recoverable_stale'])
const STATUS_PRIORITY = new Map([
  ['running', 5],
  ['active', 4],
  ['paused', 3],
  ['paused_provider_blocked', 3],
  ['recoverable_stale', 3],
  ['blocked', 2],
  ['queued', 1],
  ['complete', 0],
  ['completed', 0],
  ['failed', 0],
  ['cancelled', 0],
  ['archived', 0],
])

let canonicalJobs = []

function nowIso() {
  return new Date().toISOString()
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function normalizeTaskKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDepartment(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return 'Unassigned'
  const lower = raw.toLowerCase()
  const aliases = {
    ivy: 'Funboy',
    funboy: 'Funboy',
    nettie: 'Nettie',
    van: 'Van',
    perry: 'Perry',
    torina: 'Torina',
    scribe: 'Scribe',
    dana: 'Dana',
    icky: 'Icky',
    rab: 'Rab',
    bea: 'Bea',
  }
  return aliases[lower] || raw.charAt(0).toUpperCase() + raw.slice(1)
}

function normalizeStatus(status = '') {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'in_progress' || s === 'in-progress') return 'running'
  if (s === 'done') return 'complete'
  if (s === 'completed') return 'completed'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (s === 'archived') return 'archived'
  if (s === 'fail') return 'failed'
  if (s === 'stopped') return 'blocked'
  if (s === 'paused_provider_blocked') return 'paused_provider_blocked'
  if (s === 'recoverable_stale') return 'recoverable_stale'
  return s || 'queued'
}

function isOpenStatus(status = '') {
  return OPEN_STATUSES.has(normalizeStatus(status))
}

function isClosedStatus(status = '') {
  return CLOSED_STATUSES.has(normalizeStatus(status))
}

function statusClass(status = '') {
  const s = normalizeStatus(status)
  if (s === 'running') return 'running'
  if (s === 'queued') return 'queued'
  if (s === 'paused') return 'paused'
  if (s === 'paused_provider_blocked') return 'paused'
  if (s === 'recoverable_stale') return 'paused'
  if (s === 'blocked') return 'blocked'
  if (s === 'active') return 'active'
  if (s === 'completed' || s === 'complete') return 'completedRecent'
  if (s === 'cancelled' || s === 'archived') return 'completedRecent'
  if (s === 'failed') return 'blocked'
  return 'active'
}

function inferPriority(status = '') {
  return STATUS_PRIORITY.get(normalizeStatus(status)) ?? 0
}

function normalizeJobId(id = '', knownJobs = canonicalJobs) {
  const raw = String(id || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()

  const ids = new Map()
  for (const job of knownJobs || []) {
    if (!job) continue
    const canonical = String(job.id || job.jobId || '').trim()
    if (!canonical) continue
    ids.set(canonical.toLowerCase(), canonical)
    for (const alias of Array.isArray(job.aliases) ? job.aliases : []) {
      const aliasId = String(alias || '').trim()
      if (aliasId) ids.set(aliasId.toLowerCase(), canonical)
    }
  }

  if (ids.has(lower)) return ids.get(lower)
  const hyphen = lower.replace(/_/g, '-')
  if (ids.has(hyphen)) return ids.get(hyphen)
  const underscore = lower.replace(/-/g, '_')
  if (ids.has(underscore)) return ids.get(underscore)

  if (lower.startsWith('job_')) {
    const alt = `job-${lower.slice(4)}`
    if (ids.has(alt)) return ids.get(alt)
  }
  if (lower.startsWith('job-')) {
    const alt = `job_${lower.slice(4)}`
    if (ids.has(alt)) return ids.get(alt)
  }

  return lower
}

function normalizeAliases(jobId, aliases = []) {
  const seen = new Set()
  const out = []
  for (const alias of [jobId, ...(aliases || [])]) {
    const value = String(alias || '').trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function toHistoryArray(history = []) {
  if (!Array.isArray(history)) return []
  return history
    .filter(Boolean)
    .slice(-50)
    .map((entry) => ({
      at: entry.at || nowIso(),
      type: entry.type || 'state',
      status: entry.status || null,
      message: entry.message || '',
      data: sanitizeHistoryData(entry.data ?? null),
    }))
}

function sanitizeHistoryData(data, depth = 0) {
  if (data === null || data === undefined) return data
  if (depth > 2) return '[truncated-depth]'
  if (typeof data === 'string') return data.length > 2000 ? `${data.slice(0, 2000)}…[truncated]` : data
  if (typeof data === 'number' || typeof data === 'boolean') return data
  if (Array.isArray(data)) return data.slice(0, 10).map((entry) => sanitizeHistoryData(entry, depth + 1))
  if (typeof data === 'object') {
    const blockedKeys = new Set(['history', 'executionTrace', 'context', 'inputPayload', 'outputPayload'])
    const result = {}
    for (const [key, value] of Object.entries(data)) {
      result[key] = blockedKeys.has(key) ? '[omitted]' : sanitizeHistoryData(value, depth + 1)
    }
    return result
  }
  return String(data)
}

function buildHistoryEntry(type, status, message, data = null, at = nowIso()) {
  return { at, type, status: status || null, message: message || '', data: sanitizeHistoryData(data) }
}

function maybeSourceRef(raw = {}) {
  return raw.sourceRef || raw.sourcePath || raw.source || raw.sourceType || null
}

function canonicalizeJob(rawJob = {}, options = {}) {
  const existing = options.existing || null
  const existingAliases = Array.isArray(existing?.aliases) ? existing.aliases : []
  const rawId = String(rawJob.id || rawJob.jobId || existing?.id || `job_${crypto.randomUUID().slice(0, 8)}`)
  const candidateId = normalizeJobId(rawId, options.knownJobs || canonicalJobs)
  const resolvedId = candidateId || rawId.toLowerCase()
  const sourceType = rawJob.sourceType || existing?.sourceType || 'mission-control'
  const source = rawJob.source || existing?.source || 'mission-control'
  const task = String(rawJob.task || rawJob.title || existing?.task || 'Untitled mission').trim()
  const department = normalizeDepartment(rawJob.department || rawJob.agent || rawJob.owner || existing?.department || existing?.agent || existing?.owner)
  const status = normalizeStatus(rawJob.status || existing?.status || 'queued')
  const createdAt = rawJob.createdAt || rawJob.timestamps?.created || existing?.createdAt || existing?.timestamps?.created || nowIso()
  const updatedAt = rawJob.updatedAt || rawJob.timestamps?.updated || existing?.updatedAt || existing?.timestamps?.updated || createdAt
  const heartbeatAt = rawJob.heartbeatAt || existing?.heartbeatAt || updatedAt
  const aliases = normalizeAliases(resolvedId, [
    ...(existingAliases || []),
    rawId !== resolvedId ? rawId : null,
    rawJob.jobId && rawJob.jobId !== resolvedId ? rawJob.jobId : null,
  ])

  const history = [
    ...toHistoryArray(existing?.history),
    ...toHistoryArray(rawJob.history),
  ]
  if (!history.length) {
    history.push(buildHistoryEntry('state', status, rawJob.description || rawJob.note || 'canonicalized job record', {
      sourceType,
      sourceRef: maybeSourceRef(rawJob),
    }, updatedAt))
  }

  const job = {
    id: resolvedId,
    jobId: resolvedId,
    aliases,
    task,
    title: task,
    normalizedTask: normalizeTaskKey(task),
    department,
    agent: rawJob.agent || department,
    owner: rawJob.owner || department,
    status,
    source,
    sourceType,
    sourceRef: maybeSourceRef(rawJob),
    createdAt,
    updatedAt,
    heartbeatAt,
    phase: rawJob.phase || rawJob.stage || existing?.phase || existing?.stage || (status === 'running' ? 'IN_PROGRESS' : 'SCOPED'),
    stage: rawJob.stage || existing?.stage || (status === 'running' ? 'IN_PROGRESS' : 'SCOPED'),
    routeStatus: rawJob.routeStatus || existing?.routeStatus || status,
    priority: rawJob.priority || existing?.priority || 'P1',
    artifactRefs: Array.isArray(rawJob.artifactRefs) ? rawJob.artifactRefs : (Array.isArray(existing?.artifactRefs) ? existing.artifactRefs : []),
    error: rawJob.error ?? existing?.error ?? null,
    history,
    sourceRefs: Array.from(new Set([
      ...(Array.isArray(existing?.sourceRefs) ? existing.sourceRefs : []),
      maybeSourceRef(rawJob),
      maybeSourceRef(existing || {}),
    ].filter(Boolean))),
    inputPayload: rawJob.inputPayload !== undefined ? rawJob.inputPayload : existing?.inputPayload ?? null,
    outputPayload: rawJob.outputPayload !== undefined ? rawJob.outputPayload : existing?.outputPayload ?? null,
    context: rawJob.context !== undefined ? rawJob.context : existing?.context ?? null,
    executionPlan: Array.isArray(rawJob.executionPlan) ? rawJob.executionPlan : (Array.isArray(existing?.executionPlan) ? existing.executionPlan : []),
    executionAssignments: Array.isArray(rawJob.executionAssignments) ? rawJob.executionAssignments : (Array.isArray(existing?.executionAssignments) ? existing.executionAssignments : []),
    executionTrace: Array.isArray(rawJob.executionTrace) ? rawJob.executionTrace : (Array.isArray(existing?.executionTrace) ? existing.executionTrace : []),
    providerOutage: rawJob.providerOutage ?? existing?.providerOutage ?? false,
    lastKnownGoodStep: rawJob.lastKnownGoodStep ?? existing?.lastKnownGoodStep ?? null,
    resumeCommand: rawJob.resumeCommand ?? existing?.resumeCommand ?? null,
    artifactPath: rawJob.artifactPath ?? existing?.artifactPath ?? null,
    projectPath: rawJob.projectPath ?? existing?.projectPath ?? null,
    nextAction: rawJob.nextAction ?? existing?.nextAction ?? null,
    recoveryNote: rawJob.recoveryNote ?? existing?.recoveryNote ?? null,
    outageReason: rawJob.outageReason ?? existing?.outageReason ?? null,
    tokenCostClass: rawJob.tokenCostClass ?? existing?.tokenCostClass ?? null,
    recurring: rawJob.recurring ?? existing?.recurring ?? null,
    parentRecurringJobId: rawJob.parentRecurringJobId ?? existing?.parentRecurringJobId ?? null,
    description: rawJob.description ?? existing?.description ?? '',
    workerId: rawJob.workerId ?? existing?.workerId ?? null,
    timestamps: {
      created: createdAt,
      updated: updatedAt,
      completed: rawJob.completedAt || rawJob.timestamps?.completed || existing?.completedAt || existing?.timestamps?.completed || (isClosedStatus(status) ? updatedAt : null),
    },
    createdAt,
    updatedAt,
    completedAt: rawJob.completedAt || rawJob.timestamps?.completed || existing?.completedAt || existing?.timestamps?.completed || (isClosedStatus(status) ? updatedAt : null),
    duplicateKey: `${normalizeDepartment(department)}|${normalizeTaskKey(task)}|${statusClass(status)}`,
    isDerived: sourceType !== 'mission-control' && sourceType !== 'mc.jobs.ledger' && sourceType !== 'mc.state.jobs',
  }

  return job
}

function mergeExisting(existing, incoming) {
  const merged = canonicalizeJob({ ...existing, ...incoming }, { existing, knownJobs: canonicalJobs })
  merged.aliases = normalizeAliases(merged.id, [...(existing.aliases || []), ...(incoming.aliases || [])])
  merged.history = toHistoryArray([...(existing.history || []), ...(incoming.history || [])])
  if (!merged.sourceRef && existing.sourceRef) merged.sourceRef = existing.sourceRef
  if (!merged.source && existing.source) merged.source = existing.source
  if (!merged.sourceType && existing.sourceType) merged.sourceType = existing.sourceType
  return merged
}

function writePersistedJobs(jobs) {
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(jobsPath, JSON.stringify(jobs, null, 2))
}

function readPersistedJobs() {
  try {
    if (fs.existsSync(jobsPath)) {
      const parsed = JSON.parse(fs.readFileSync(jobsPath, 'utf8'))
      return Array.isArray(parsed) ? parsed : []
    }
  } catch {
    // ignore load failure and start from empty
  }
  return []
}

function upsertCanonical(rawJob, options = {}) {
  const canonical = canonicalizeJob(rawJob, { ...options, knownJobs: canonicalJobs })
  const idx = canonicalJobs.findIndex((job) => job.id === canonical.id)
  if (idx >= 0) {
    canonicalJobs[idx] = mergeExisting(canonicalJobs[idx], canonical)
    return canonicalJobs[idx]
  }
  canonicalJobs.unshift(canonical)
  return canonical
}

function loadJobs({ legacyJobs = [], legacyStateJobs = [], projectLedgerEntries = [], legacyRecoveryEntries = [] } = {}) {
  const persisted = readPersistedJobs()
  const seed = [
    ...persisted,
    ...legacyJobs,
    ...legacyStateJobs,
    ...legacyRecoveryEntries.map((entry) => ({
      id: entry.jobId || entry.id,
      jobId: entry.jobId || entry.id,
      task: entry.task || entry.project || entry.title || 'Untitled mission',
      title: entry.task || entry.project || entry.title || 'Untitled mission',
      department: entry.owner || entry.department || 'Unassigned',
      agent: entry.owner || entry.agent || entry.department || 'Unassigned',
      owner: entry.owner || entry.agent || entry.department || 'Unassigned',
      status: entry.status || 'queued',
      sourceType: 'recovery-ledger',
      source: entry.source || 'recovery-ledger',
      sourceRef: entry.source || 'recovery-ledger',
      updatedAt: entry.lastUpdate || entry.updatedAt || nowIso(),
      createdAt: entry.createdAt || entry.lastUpdate || nowIso(),
      heartbeatAt: entry.lastUpdate || entry.updatedAt || nowIso(),
      routeStatus: entry.status || 'queued',
      nextAction: entry.nextAction || null,
      recoveryNote: entry.recoveryNote || null,
      providerOutage: entry.providerOutage ?? false,
      lastKnownGoodStep: entry.lastKnownGoodStep ?? null,
      resumeCommand: entry.resumeCommand ?? null,
      artifactPath: entry.artifactPath ?? null,
      projectPath: entry.projectPath ?? null,
      outageReason: entry.outageReason ?? null,
      aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
      history: Array.isArray(entry.history) ? entry.history : [{ at: entry.lastUpdate || nowIso(), type: 'recovery', status: entry.status || 'queued', message: entry.recoveryNote || 'recovery ledger import', data: entry }],
    })),
    ...projectLedgerEntries.map((entry) => ({
      ...entry,
      sourceType: 'project-ledger',
      source: entry.source || 'project-ledger',
      sourceRef: entry.source || entry.sourceRef || null,
    })),
  ]

  canonicalJobs = []
  for (const raw of seed) {
    if (!raw || typeof raw !== 'object') continue
    upsertCanonical(raw, { knownJobs: canonicalJobs })
  }

  saveJobs(canonicalJobs)
  return getAllJobs()
}

function saveJobs(jobs = canonicalJobs) {
  canonicalJobs = (Array.isArray(jobs) ? jobs : []).map((job) => canonicalizeJob(job, { existing: job, knownJobs: jobs }))
  canonicalJobs.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
  writePersistedJobs(canonicalJobs)
  return getAllJobs()
}

function getAllJobs() {
  return deepClone(canonicalJobs)
}

function resolveExistingJob(id) {
  const normalized = normalizeJobId(id, canonicalJobs)
  return canonicalJobs.find((job) => {
    const ids = [job.id, job.jobId, ...(Array.isArray(job.aliases) ? job.aliases : [])].filter(Boolean).map((value) => String(value).toLowerCase())
    return ids.includes(String(normalized).toLowerCase()) || ids.includes(String(id || '').toLowerCase())
  }) || null
}

function getJobById(id) {
  const job = resolveExistingJob(id)
  return job ? deepClone(job) : null
}

function findDuplicateJob(input = {}, { includeClosed = false } = {}) {
  const department = normalizeDepartment(input.department || input.agent || input.owner || '')
  const task = String(input.task || input.title || '').trim()
  const normalizedTask = normalizeTaskKey(task)
  if (!normalizedTask) return null

  const wantedClass = input.status ? statusClass(input.status) : null
  const matches = canonicalJobs.filter((job) => {
    const jobClass = statusClass(job.status)
    const liveMatch = LIVE_STATUS_CLASS.has(normalizeStatus(job.status))
    const statusMatch = wantedClass ? jobClass === wantedClass : (includeClosed ? true : liveMatch)
    return normalizeDepartment(job.department || job.agent || job.owner || '') === department
      && normalizeTaskKey(job.task || job.title || '') === normalizedTask
      && statusMatch
  })

  const liveMatches = matches.filter((job) => LIVE_STATUS_CLASS.has(normalizeStatus(job.status)))
  const candidates = liveMatches.length ? liveMatches : matches
  if (!candidates.length) {
    if (!includeClosed) return null
    const historical = canonicalJobs.filter((job) =>
      normalizeDepartment(job.department || job.agent || job.owner || '') === department
      && normalizeTaskKey(job.task || job.title || '') === normalizedTask
    )
    if (historical.length < 2) return null
    return historical.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0]
  }

  if (candidates.length < 2 && !includeClosed && !liveMatches.length) return null
  return candidates.sort((a, b) => {
    const pa = inferPriority(a.status)
    const pb = inferPriority(b.status)
    if (pa !== pb) return pb - pa
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  })[0]
}

function createJob(input = {}) {
  const normalizedInput = {
    ...input,
    id: input.id || input.jobId || undefined,
    jobId: input.jobId || input.id || undefined,
    task: input.task || input.title || 'Untitled mission',
    department: input.department || input.agent || input.owner || 'Nettie',
    status: input.status || 'queued',
    sourceType: input.sourceType || 'mission-control',
    source: input.source || 'mission-control',
    sourceRef: input.sourceRef || input.sourcePath || null,
    createdAt: input.createdAt || nowIso(),
    updatedAt: input.updatedAt || nowIso(),
    heartbeatAt: input.heartbeatAt || input.updatedAt || nowIso(),
  }

  const duplicate = findDuplicateJob({
    department: normalizedInput.department,
    task: normalizedInput.task,
    status: normalizedInput.status,
  })

  if (duplicate) {
    const merged = updateJob(duplicate.id, {
      ...normalizedInput,
      updatedAt: normalizedInput.updatedAt,
      history: [buildHistoryEntry('dedupe', normalizedInput.status, 'reused existing open/live job', { input: normalizedInput }, normalizedInput.updatedAt)],
    })
    return { job: merged, deduped: true, duplicateOf: duplicate.id }
  }

  const canonical = upsertCanonical(normalizedInput, { knownJobs: canonicalJobs })
  canonical.history = [...toHistoryArray(canonical.history), buildHistoryEntry('create', canonical.status, 'job created', { sourceType: canonical.sourceType }, canonical.updatedAt)]
  saveJobs(canonicalJobs)
  return { job: getJobById(canonical.id), deduped: false, duplicateOf: null }
}

function updateJob(id, patch = {}) {
  const job = resolveExistingJob(id)
  if (!job) return null
  const idx = canonicalJobs.findIndex((entry) => entry.id === job.id)
  if (idx < 0) return null

  const updatedAt = patch.updatedAt || nowIso()
  const next = mergeExisting(canonicalJobs[idx], {
    ...patch,
    id: job.id,
    jobId: job.id,
    updatedAt,
    heartbeatAt: patch.heartbeatAt || updatedAt,
    sourceRef: patch.sourceRef || canonicalJobs[idx].sourceRef,
  })

  if (patch.status) next.status = normalizeStatus(patch.status)
  if (patch.department || patch.agent || patch.owner) next.department = normalizeDepartment(patch.department || patch.agent || patch.owner)
  if (patch.task || patch.title) {
    next.task = String(patch.task || patch.title).trim()
    next.title = next.task
    next.normalizedTask = normalizeTaskKey(next.task)
    next.duplicateKey = `${normalizeDepartment(next.department)}|${next.normalizedTask}|${statusClass(next.status)}`
  }
  if (patch.aliases) next.aliases = normalizeAliases(next.id, [...next.aliases, ...patch.aliases])
  if (patch.history) next.history = [...toHistoryArray(next.history), ...toHistoryArray(patch.history)]
  if (patch.artifactRefs) next.artifactRefs = Array.isArray(patch.artifactRefs) ? patch.artifactRefs : next.artifactRefs
  if (patch.error !== undefined) next.error = patch.error
  if (patch.inputPayload !== undefined) next.inputPayload = patch.inputPayload
  if (patch.outputPayload !== undefined) next.outputPayload = patch.outputPayload
  if (patch.context !== undefined) next.context = patch.context
  if (patch.executionPlan !== undefined) next.executionPlan = patch.executionPlan
  if (patch.executionAssignments !== undefined) next.executionAssignments = patch.executionAssignments
  if (patch.executionTrace !== undefined) next.executionTrace = Array.isArray(patch.executionTrace) ? [...(next.executionTrace || []), ...patch.executionTrace] : next.executionTrace
  if (patch.phase !== undefined) next.phase = patch.phase
  if (patch.stage !== undefined) next.stage = patch.stage
  if (patch.routeStatus !== undefined) next.routeStatus = patch.routeStatus
  if (patch.priority !== undefined) next.priority = patch.priority
  if (patch.workerId !== undefined) next.workerId = patch.workerId
  if (patch.providerOutage !== undefined) next.providerOutage = patch.providerOutage
  if (patch.lastKnownGoodStep !== undefined) next.lastKnownGoodStep = patch.lastKnownGoodStep
  if (patch.resumeCommand !== undefined) next.resumeCommand = patch.resumeCommand
  if (patch.artifactPath !== undefined) next.artifactPath = patch.artifactPath
  if (patch.projectPath !== undefined) next.projectPath = patch.projectPath
  if (patch.nextAction !== undefined) next.nextAction = patch.nextAction
  if (patch.recoveryNote !== undefined) next.recoveryNote = patch.recoveryNote
  if (patch.outageReason !== undefined) next.outageReason = patch.outageReason
  if (patch.tokenCostClass !== undefined) next.tokenCostClass = patch.tokenCostClass
  if (patch.recurring !== undefined) next.recurring = patch.recurring
  if (patch.parentRecurringJobId !== undefined) next.parentRecurringJobId = patch.parentRecurringJobId

  next.updatedAt = updatedAt
  next.heartbeatAt = patch.heartbeatAt || updatedAt
  next.timestamps = {
    ...(next.timestamps || {}),
    created: next.timestamps?.created || next.createdAt || updatedAt,
    updated: updatedAt,
    completed: patch.completedAt !== undefined ? patch.completedAt : next.timestamps?.completed || next.completedAt || (isClosedStatus(next.status) ? updatedAt : null),
  }
  next.createdAt = next.timestamps.created
  next.completedAt = next.timestamps.completed
  next.history = [...toHistoryArray(next.history), buildHistoryEntry('update', next.status, patch.historyMessage || 'job updated', patch.historyData ?? patch, updatedAt)]

  canonicalJobs[idx] = canonicalizeJob(next, { existing: next, knownJobs: canonicalJobs })
  saveJobs(canonicalJobs)
  return getJobById(job.id)
}

function transitionJob(id, status, metadata = {}) {
  const normalizedStatus = normalizeStatus(status)
  const updatedAt = metadata.updatedAt || nowIso()
  return updateJob(id, {
    ...metadata,
    status: normalizedStatus,
    phase: metadata.phase || (normalizedStatus === 'running' ? 'IN_PROGRESS' : metadata.phase),
    stage: metadata.stage || (normalizedStatus === 'running' ? 'IN_PROGRESS' : metadata.stage),
    routeStatus: metadata.routeStatus || normalizedStatus,
    completedAt: CLOSED_STATUSES.has(normalizedStatus) ? (metadata.completedAt || updatedAt) : metadata.completedAt,
    heartbeatAt: metadata.heartbeatAt || updatedAt,
    updatedAt,
    history: [buildHistoryEntry('transition', normalizedStatus, metadata.reason || `transition → ${normalizedStatus}`, metadata, updatedAt)],
  })
}

function deriveLedgerView() {
  return deepClone(canonicalJobs).sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
}

function normalizeRegistryJob(job = {}) {
  return {
    id: job.id || job.jobId,
    jobId: job.jobId || job.id,
    task: job.task || job.title || 'Untitled mission',
    title: job.title || job.task || 'Untitled mission',
    normalizedTask: job.normalizedTask || normalizeTaskKey(job.task || job.title || ''),
    department: normalizeDepartment(job.department || job.agent || job.owner || ''),
    agent: job.agent || job.department || job.owner || 'Unassigned',
    owner: job.owner || job.agent || job.department || 'Unassigned',
    status: normalizeStatus(job.status),
    source: job.source || 'mission-control',
    sourceType: job.sourceType || 'mission-control',
    sourceRef: job.sourceRef || null,
    routeStatus: job.routeStatus || job.status || 'queued',
    updatedAt: job.updatedAt || job.timestamps?.updated || job.createdAt || null,
    createdAt: job.createdAt || job.timestamps?.created || null,
    completedAt: job.completedAt || job.timestamps?.completed || null,
    sourceRefs: job.sourceRefs || [],
    aliases: job.aliases || [],
    detail: job.detail || null,
    searchable: job.searchable || '',
    priority: job.priority || 'P1',
    history: job.history || [],
    artifactRefs: job.artifactRefs || [],
    error: job.error ?? null,
    nextAction: job.nextAction ?? null,
    recoveryNote: job.recoveryNote ?? null,
    providerOutage: job.providerOutage ?? false,
    lastKnownGoodStep: job.lastKnownGoodStep ?? null,
    resumeCommand: job.resumeCommand ?? null,
    outageReason: job.outageReason ?? null,
    tokenCostClass: job.tokenCostClass ?? null,
    recurring: job.recurring ?? null,
    parentRecurringJobId: job.parentRecurringJobId ?? null,
  }
}

function dedupeRegistryBucket(items = []) {
  const kept = []
  const seen = new Set()
  for (const item of items.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))) {
    const key = `${normalizeDepartment(item.department || item.agent || item.owner || '')}|${normalizeTaskKey(item.task || item.title || '')}|${normalizeStatus(item.status)}|${item.sourceType || 'mission-control'}`
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(item)
  }
  return kept
}

function inferBucket(status = '', routeStatus = '') {
  const s = normalizeStatus(status)
  const r = String(routeStatus || '').toLowerCase()
  if (s === 'running' || r === 'running') return 'running'
  if (s === 'queued' || r === 'queued' || r.startsWith('awaiting-')) return 'queued'
  if (s === 'paused' || s === 'paused_provider_blocked' || s === 'recoverable_stale' || r === 'paused' || r === 'paused_provider_blocked' || r === 'recoverable_stale') return 'paused'
  if (s === 'blocked' || r === 'blocked') return 'blocked'
  if (s === 'complete' || s === 'completed' || s === 'cancelled' || s === 'archived') return 'completedRecent'
  if (s === 'failed') return 'blocked'
  return 'active'
}

function deriveRegistryView({ workerEntries = [] } = {}) {
  const registry = {
    active: [],
    queued: [],
    running: [],
    paused: [],
    blocked: [],
    completedRecent: [],
    sources: [
      { name: 'canonical-job-store', count: canonicalJobs.length, path: jobsPath },
    ],
  }

  const pushToBucket = (jobLike) => {
    const bucket = inferBucket(jobLike.status, jobLike.routeStatus)
    if (registry[bucket]) registry[bucket].push(normalizeRegistryJob(jobLike))
  }

  for (const job of canonicalJobs) pushToBucket(job)

  if (Array.isArray(workerEntries) && workerEntries.length) {
    registry.sources.push({ name: 'mc.workers', count: workerEntries.length, path: `${runtimeDir}/workers` })
    for (const worker of workerEntries) {
      pushToBucket({
        id: worker.jobId || worker.id,
        jobId: worker.jobId || worker.id,
        task: worker.jobTitle || worker.task || `Worker ${worker.id}`,
        title: worker.jobTitle || worker.task || `Worker ${worker.id}`,
        department: 'Van',
        agent: 'Van',
        owner: 'Van',
        status: worker.status === 'completed' ? 'completed' : worker.status === 'failed' ? 'blocked' : worker.status,
        routeStatus: worker.status,
        source: 'mc.workers',
        sourceType: 'worker',
        sourceRef: worker.id,
        createdAt: worker.startedAt || worker.createdAt || nowIso(),
        updatedAt: worker.endedAt || worker.startedAt || worker.updatedAt || nowIso(),
        completedAt: worker.endedAt || null,
        detail: worker.jobTitle || null,
      })
    }
  }

  registry.active = dedupeRegistryBucket(registry.active)
  registry.queued = dedupeRegistryBucket(registry.queued)
  registry.running = dedupeRegistryBucket(registry.running)
  registry.paused = dedupeRegistryBucket(registry.paused)
  registry.blocked = dedupeRegistryBucket(registry.blocked)
  registry.completedRecent = dedupeRegistryBucket(registry.completedRecent).slice(0, 25)
  return registry
}

function deriveStatusSummary({ workerEntries = [] } = {}) {
  const registry = deriveRegistryView({ workerEntries })
  return {
    total: canonicalJobs.length,
    open: canonicalJobs.filter((job) => isOpenStatus(job.status)).length,
    closed: canonicalJobs.filter((job) => isClosedStatus(job.status)).length,
    statuses: canonicalJobs.reduce((acc, job) => {
      const key = normalizeStatus(job.status)
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
    buckets: {
      active: registry.active.length,
      queued: registry.queued.length,
      running: registry.running.length,
      paused: registry.paused.length,
      blocked: registry.blocked.length,
      completedRecent: registry.completedRecent.length,
    },
  }
}

function deriveTelegramStatusView({ workerEntries = [] } = {}) {
  const registry = deriveRegistryView({ workerEntries })
  const cancelled = canonicalJobs
    .filter((job) => normalizeStatus(job.status) === 'cancelled')
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .map(normalizeRegistryJob)

  return {
    active: registry.active,
    queued: registry.queued,
    running: registry.running,
    paused: registry.paused,
    blocked: registry.blocked,
    completed: registry.completedRecent,
    cancelled,
    sources: registry.sources,
    counts: {
      active: registry.active.length,
      queued: registry.queued.length,
      running: registry.running.length,
      paused: registry.paused.length,
      blocked: registry.blocked.length,
      completed: registry.completedRecent.length,
      cancelled: cancelled.length,
    },
  }
}

function toMissionStateJob(job = {}) {
  return {
    id: job.id,
    title: job.task || job.title || 'Untitled mission',
    owner: job.owner || job.agent || job.department || 'Unassigned',
    priority: job.priority || 'P1',
    stage: job.stage || job.phase || (normalizeStatus(job.status) === 'running' ? 'IN_PROGRESS' : 'SCOPED'),
    status: normalizeStatus(job.status) === 'complete' ? 'completed' : normalizeStatus(job.status),
    routeStatus: job.routeStatus || normalizeStatus(job.status),
    description: job.description || '',
    workerId: job.workerId || null,
    updatedAt: job.updatedAt || job.createdAt || nowIso(),
    sourceType: job.sourceType || 'mission-control',
    sourceRef: job.sourceRef || null,
    aliases: Array.isArray(job.aliases) ? job.aliases : [],
  }
}

function deriveMissionStateJobs() {
  return canonicalJobs.map(toMissionStateJob)
}

export {
  normalizeStatus,
  normalizeDepartment,
  inferBucket,
  deriveMissionStateJobs,
}

export {
  loadJobs,
  saveJobs,
  getAllJobs,
  getJobById,
  normalizeJobId,
  canonicalizeJob,
  createJob,
  updateJob,
  transitionJob,
  findDuplicateJob,
  deriveLedgerView,
  deriveRegistryView,
  deriveStatusSummary,
  deriveTelegramStatusView,
  toMissionStateJob,
}
