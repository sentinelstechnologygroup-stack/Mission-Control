import fs from 'fs'
import path from 'path'

const OPEN_STATUSES = new Set(['queued', 'running', 'active', 'paused', 'blocked', 'paused_provider_blocked', 'recoverable_stale'])
const TERMINAL_STATUSES = new Set(['complete', 'completed', 'failed', 'cancelled', 'archived'])
const PATRICK_REVIEW_RE = /\b(deploy|deployment|production|client[- ]facing|security|auth|secret|finance|financial|investment|legal)\b/i

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeStatus(status = '') {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'in_progress' || s === 'in-progress') return 'running'
  if (s === 'done') return 'complete'
  if (s === 'stopped') return 'blocked'
  return s || 'queued'
}

function isOpenStatus(status = '') {
  return OPEN_STATUSES.has(normalizeStatus(status))
}

function chooseNewest(values = []) {
  return values.filter(Boolean).sort().slice(-1)[0] || null
}

function dedupeById(items = []) {
  const byId = new Map()
  for (const item of items || []) {
    if (!item) continue
    const id = String(item.id || item.jobId || '').trim()
    if (!id) continue
    const prev = byId.get(id)
    const prevTs = String(prev?.updatedAt || prev?.lastUpdate || prev?.createdAt || '')
    const nextTs = String(item.updatedAt || item.lastUpdate || item.createdAt || '')
    if (!prev || nextTs >= prevTs) byId.set(id, item)
  }
  return Array.from(byId.values())
}

function indexById(items = []) {
  const map = new Map()
  for (const item of items || []) {
    const id = String(item?.id || item?.jobId || '').trim()
    if (id) map.set(id, item)
  }
  return map
}

function buildTaskKey(job = {}) {
  return `${normalizeText(job.owner || job.agent || job.department || '')}|${normalizeText(job.task || job.title || '')}`
}

function collectRegistryOpenJobs(registry = {}) {
  return dedupeById([
    ...(registry.active || []),
    ...(registry.running || []),
    ...(registry.queued || []),
    ...(registry.paused || []),
    ...(registry.blocked || []),
  ])
}

export function buildActiveWorkView(registry = {}) {
  const jobs = collectRegistryOpenJobs(registry)
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
  return {
    count: jobs.length,
    jobs,
    activeSubsetCount: Array.isArray(registry.active) ? registry.active.length : 0,
    buckets: {
      active: Array.isArray(registry.active) ? registry.active.length : 0,
      running: Array.isArray(registry.running) ? registry.running.length : 0,
      queued: Array.isArray(registry.queued) ? registry.queued.length : 0,
      paused: Array.isArray(registry.paused) ? registry.paused.length : 0,
      blocked: Array.isArray(registry.blocked) ? registry.blocked.length : 0,
      completedRecent: Array.isArray(registry.completedRecent) ? registry.completedRecent.length : 0,
    },
  }
}

function classifyJob({ job, duplicateCount = 0, matchingRunning = null, runtimeJob = null, worker = null, staleCutoffMs = null }) {
  const status = normalizeStatus(job.status)
  const routeStatus = String(job.routeStatus || '').toLowerCase()
  const title = String(job.task || job.title || '')
  const sourceType = String(job.sourceType || '').toLowerCase()
  const lastUpdated = chooseNewest([job.updatedAt, runtimeJob?.updatedAt, matchingRunning?.updatedAt, worker?.updatedAt, worker?.endedAt, worker?.startedAt])

  if (TERMINAL_STATUSES.has(status)) {
    return {
      classification: 'cancelled_or_archived',
      recommendedAction: 'Keep archived; do not auto-resume terminal work.',
      sourceOfTruth: 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'terminal_status',
    }
  }

  if (matchingRunning) {
    return {
      classification: 'already_running_elsewhere',
      recommendedAction: 'Do not resume; another live source already shows this work running.',
      sourceOfTruth: matchingRunning.sourceType === 'worker' ? 'worker-state' : (matchingRunning.sourceType === 'project-ledger' ? 'work-registry' : 'runtime-state'),
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'already_running_elsewhere',
    }
  }

  if (duplicateCount > 1) {
    return {
      classification: 'duplicate',
      recommendedAction: 'Hold auto-resume and review duplicate open records before any restart.',
      sourceOfTruth: 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'duplicate_open_job',
    }
  }

  if (routeStatus === 'paused_provider_blocked' || job.providerOutage) {
    return {
      classification: 'blocked_provider',
      recommendedAction: 'Wait for provider recovery and rerun reconciliation before resume.',
      sourceOfTruth: runtimeJob ? 'runtime-state' : 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'provider_blocked',
    }
  }

  if (routeStatus === 'recoverable_stale') {
    return {
      classification: 'stale_needs_review',
      recommendedAction: 'Review stale worker/job state manually before any resume.',
      sourceOfTruth: runtimeJob ? 'runtime-state' : 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'stale_needs_review',
    }
  }

  if (!title.trim() || (!job.projectPath && job.inputPayload && !job.inputPayload.projectPath && !job.inputPayload.cwd && !job.inputPayload.project_path)) {
    return {
      classification: 'blocked_missing_context',
      recommendedAction: 'Add missing execution context before any auto-resume attempt.',
      sourceOfTruth: 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'missing_context',
    }
  }

  if (PATRICK_REVIEW_RE.test(`${title} ${job.description || ''} ${job.nextAction || ''}`)) {
    return {
      classification: 'blocked_needs_patrick',
      recommendedAction: 'Escalate to Patrick before resuming this high-risk work item.',
      sourceOfTruth: runtimeJob ? 'runtime-state' : 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'patrick_review_required',
    }
  }

  if (sourceType === 'project-ledger' || sourceType === 'recovery-ledger') {
    return {
      classification: 'manual_only',
      recommendedAction: 'Keep manual-only until reconciled against live runtime ownership.',
      sourceOfTruth: sourceType === 'project-ledger' ? 'work-registry' : 'jobs-ledger',
      lastUpdated,
      autoResumeAllowed: false,
      autoResumeReason: 'manual_only_source',
    }
  }

  if (staleCutoffMs) {
    const heartbeat = Date.parse(job.heartbeatAt || job.updatedAt || job.createdAt || 0)
    const nowMs = Date.now()
    if (Number.isFinite(heartbeat) && nowMs - heartbeat > staleCutoffMs && ['running', 'active', 'paused'].includes(status)) {
      return {
        classification: 'stale_needs_review',
        recommendedAction: 'Refresh ownership and heartbeat before attempting resume.',
        sourceOfTruth: runtimeJob ? 'runtime-state' : 'jobs-ledger',
        lastUpdated,
        autoResumeAllowed: false,
        autoResumeReason: 'stale_heartbeat',
      }
    }
  }

  return {
    classification: 'safe_to_resume',
    recommendedAction: 'Eligible for resume after reconciliation is explicitly cleared.',
    sourceOfTruth: runtimeJob ? 'runtime-state' : 'jobs-ledger',
    lastUpdated,
    autoResumeAllowed: true,
    autoResumeReason: null,
  }
}

export function buildRecoveryReconciliationReport({
  ledgerJobs = [],
  registry = {},
  runtimeJobs = [],
  workers = [],
  governanceState = {},
  now = new Date().toISOString(),
} = {}) {
  const openLedgerJobs = dedupeById((ledgerJobs || []).filter((job) => isOpenStatus(job.status)))
  const registryOpenJobs = collectRegistryOpenJobs(registry)
  const runtimeOpenJobs = dedupeById((runtimeJobs || []).filter((job) => isOpenStatus(job.status)))
  const workerEntries = dedupeById((workers || []).map((worker) => ({
    ...worker,
    id: worker.jobId || worker.id,
    jobId: worker.jobId || worker.id,
    sourceType: 'worker',
    updatedAt: worker.endedAt || worker.startedAt || worker.updatedAt || now,
    task: worker.jobTitle || worker.task || worker.id,
    owner: 'Van',
  })))

  const runtimeById = indexById(runtimeOpenJobs)
  const runningElsewhereByTask = new Map()
  for (const item of [...registryOpenJobs, ...workerEntries]) {
    const status = normalizeStatus(item.status)
    if (status !== 'running' && status !== 'active') continue
    const key = buildTaskKey(item)
    if (!key || !normalizeText(item.task || item.title || '').trim()) continue
    const prev = runningElsewhereByTask.get(key)
    const prevTs = String(prev?.updatedAt || prev?.createdAt || '')
    const nextTs = String(item.updatedAt || item.createdAt || '')
    if (!prev || nextTs >= prevTs) runningElsewhereByTask.set(key, item)
  }

  const duplicateCounts = new Map()
  const duplicateIdSets = new Map()
  for (const job of [...openLedgerJobs, ...registryOpenJobs, ...runtimeOpenJobs]) {
    const key = buildTaskKey(job)
    const id = String(job.id || job.jobId || '').trim()
    if (!key || !id) continue
    const ids = duplicateIdSets.get(key) || new Set()
    ids.add(id)
    duplicateIdSets.set(key, ids)
  }
  for (const [key, ids] of duplicateIdSets.entries()) {
    duplicateCounts.set(key, ids.size)
  }

  const recoverableStatuses = new Set(['queued', 'paused', 'blocked', 'recoverable_stale', 'paused_provider_blocked'])
  const reportJobs = openLedgerJobs
    .map((job) => {
      const taskKey = buildTaskKey(job)
      const runtimeJob = runtimeById.get(job.id) || null
      const matchingRunning = (() => {
        const candidate = runningElsewhereByTask.get(taskKey)
        if (!candidate) return null
        if (String(candidate.id || candidate.jobId || '') === String(job.id)) return null
        return candidate
      })()
      const worker = workerEntries.find((entry) => String(entry.id || entry.jobId || '') === String(job.id)) || null
      const details = classifyJob({
        job,
        duplicateCount: duplicateCounts.get(taskKey) || 0,
        matchingRunning,
        runtimeJob,
        worker,
        staleCutoffMs: 60 * 60 * 1000,
      })
      const isRecoverable = recoverableStatuses.has(normalizeStatus(job.status)) || ['paused_provider_blocked', 'recoverable_stale'].includes(String(job.routeStatus || '').toLowerCase())
      const autoResumeAllowed = Boolean(isRecoverable && details.autoResumeAllowed && false)
      const autoResumeReason = autoResumeAllowed ? null : (details.autoResumeReason || 'reconciliation_required')
      return {
        jobId: job.id,
        title: job.task || job.title || 'Untitled mission',
        owner: job.owner || job.agent || job.department || 'Unassigned',
        currentStatus: job.status,
        routeStatus: job.routeStatus || null,
        sourceOfTruth: details.sourceOfTruth,
        lastUpdated: details.lastUpdated || job.updatedAt || job.createdAt || now,
        recoveryClassification: details.classification,
        recommendedAction: details.recommendedAction,
        autoResumeAllowed,
        autoResumeReason,
        duplicateCount: duplicateCounts.get(taskKey) || 0,
        providerOutage: Boolean(job.providerOutage),
        nextAction: job.nextAction || null,
        sourceType: job.sourceType || 'mission-control',
      }
    })
    .sort((a, b) => String(b.lastUpdated || '').localeCompare(String(a.lastUpdated || '')))

  const classificationCounts = reportJobs.reduce((acc, job) => {
    acc[job.recoveryClassification] = (acc[job.recoveryClassification] || 0) + 1
    return acc
  }, {})

  const summary = {
    generatedAt: now,
    reconciliationRequired: true,
    autoResumeEnabled: false,
    cooldownActive: Boolean(governanceState?.cooldown?.active),
    counts: {
      ledgerOpen: openLedgerJobs.length,
      registryOpen: registryOpenJobs.length,
      runtimeOpen: runtimeOpenJobs.length,
      workers: workerEntries.length,
      safeToResumeCandidates: reportJobs.filter((job) => job.recoveryClassification === 'safe_to_resume').length,
      autoResumeAllowed: reportJobs.filter((job) => job.autoResumeAllowed).length,
    },
    bucketCounts: {
      active: Array.isArray(registry.active) ? registry.active.length : 0,
      running: Array.isArray(registry.running) ? registry.running.length : 0,
      queued: Array.isArray(registry.queued) ? registry.queued.length : 0,
      paused: Array.isArray(registry.paused) ? registry.paused.length : 0,
      blocked: Array.isArray(registry.blocked) ? registry.blocked.length : 0,
      completedRecent: Array.isArray(registry.completedRecent) ? registry.completedRecent.length : 0,
    },
    classificationCounts,
    notes: [
      'Auto-resume is frozen until reconciliation is explicitly cleared.',
      'No job status mutations should occur from the recovery controller while reconciliationRequired=true.',
      'safe_to_resume classifications remain blocked until the reconciliation gate is lifted.',
    ],
  }

  return {
    generatedAt: now,
    reconciliationRequired: true,
    autoResumeEnabled: false,
    freezeReason: 'Recovery reconciliation gate is active. Auto-resume must not restart work until ledger/runtime truth is reconciled.',
    summary,
    jobs: reportJobs,
  }
}

export function saveRecoveryReconciliationReport(filePath, report) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2))
}

export function loadRecoveryReconciliationReport(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

export function buildRecoveryReconciliationMarkdown(report = {}) {
  const lines = [
    '# Recovery Reconciliation Report',
    '',
    `Generated: ${report.generatedAt || 'unknown'}`,
    `Reconciliation required: ${report.reconciliationRequired ? 'yes' : 'no'}`,
    `Auto-resume enabled: ${report.autoResumeEnabled ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
  ]

  for (const [key, value] of Object.entries(report.summary?.counts || {})) {
    lines.push(`- ${key}: ${value}`)
  }
  for (const [key, value] of Object.entries(report.summary?.classificationCounts || {})) {
    lines.push(`- classification.${key}: ${value}`)
  }

  lines.push('', '## Jobs', '')
  for (const job of report.jobs || []) {
    lines.push(`- ${job.jobId} | ${job.title} | owner=${job.owner} | status=${job.currentStatus} | class=${job.recoveryClassification} | autoResumeAllowed=${job.autoResumeAllowed ? 'true' : 'false'} | action=${job.recommendedAction}`)
  }
  lines.push('')
  return lines.join('\n')
}
