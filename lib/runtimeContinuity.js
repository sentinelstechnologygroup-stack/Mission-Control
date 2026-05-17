import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

function checksumPayload(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex')
}

function readJsonLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return []
    return fs.readFileSync(filePath, 'utf8').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
  } catch {
    return []
  }
}

function appendJsonLine(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`)
  return value
}

function atomicWriteJson(filePath, value) {
  ensureDir(path.dirname(filePath))
  const tmpPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2))
  fs.renameSync(tmpPath, filePath)
  return value
}

function writeVersionedSnapshot(snapshotDir, kind, value, metadata = {}) {
  ensureDir(snapshotDir)
  const snapshotId = `${kind}-${Date.now()}`
  const snapshot = {
    snapshotId,
    kind,
    generatedAt: metadata.generatedAt || new Date().toISOString(),
    checksum: checksumPayload(value),
    metadata,
    payload: value,
  }
  const filePath = path.join(snapshotDir, `${snapshotId}.json`)
  atomicWriteJson(filePath, snapshot)
  return { filePath, snapshot }
}

function recordArtifactWrite(paths, { kind, targetFile, value, metadata = {} }) {
  const now = metadata.generatedAt || new Date().toISOString()
  const checksum = checksumPayload(value)
  appendJsonLine(paths.journal, {
    timestamp: now,
    action: 'prepare_write',
    kind,
    targetFile,
    checksum,
    metadata,
  })
  const versioned = writeVersionedSnapshot(paths.snapshotDir, kind, value, metadata)
  atomicWriteJson(targetFile, value)
  appendJsonLine(paths.events, {
    eventId: `${kind}_${Date.now()}`,
    timestamp: now,
    type: `${kind}_written`,
    checksum,
    targetFile,
    versionedSnapshot: versioned.filePath,
    metadata,
  })
  appendJsonLine(paths.journal, {
    timestamp: now,
    action: 'commit_write',
    kind,
    targetFile,
    checksum,
    versionedSnapshot: versioned.filePath,
    metadata,
  })
  return value
}

function normalizeStatus(status = '') {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'in_progress' || s === 'in-progress') return 'running'
  if (s === 'done') return 'complete'
  return s || 'queued'
}

function summarizeJob(job = {}) {
  return {
    jobId: job.id || job.jobId,
    title: job.title || job.task || 'Untitled job',
    owner: job.owner || job.agent || 'Unassigned',
    status: job.status || null,
    routeStatus: job.routeStatus || null,
    selectedExecutor: job.selectedExecutor || null,
    blockedReason: job.blockedReason || null,
    recoveryClassification: job.recoveryClassification || null,
    staleClassification: job.staleClassification || null,
    priorityScore: job.priorityScore ?? null,
    dependencyReadiness: job.dependencyReadiness || null,
  }
}

function itemKey(item = {}) {
  return String(item.jobId || item.id || item.title || '')
}

function buildUnresolvedItems({ queuePriorities = {}, reconciliationQueues = {}, nextActions = {} } = {}) {
  const unresolved = []
  for (const item of queuePriorities.priorities || []) {
    if (item.blockedReason || item.recoveryClassification || item.staleClassification) {
      unresolved.push({
        id: itemKey(item),
        type: 'job',
        reason: item.blockedReason || item.recoveryClassification || item.staleClassification,
        title: item.title,
        sourceRefs: [`job:${item.jobId || item.id || item.title}`],
      })
    }
  }
  for (const [queueType, queue] of Object.entries(reconciliationQueues.queues || {})) {
    for (const item of queue.items || []) {
      unresolved.push({
        id: `${queueType}:${item.jobId}`,
        type: 'reconciliation',
        reason: queueType,
        title: item.title,
        sourceRefs: [`reconciliation:${queueType}:${item.jobId}`],
      })
    }
  }
  for (const item of nextActions.nextActions || []) {
    if (!item.executable) {
      unresolved.push({
        id: `next:${item.jobId || item.title}`,
        type: 'next_action',
        reason: item.blockedReason || item.mode || 'review',
        title: item.title,
        sourceRefs: [`next_action:${item.jobId || item.title}`],
      })
    }
  }
  return unresolved
}

export function getRuntimeContinuityPaths(runtimeDir) {
  const snapshotDir = path.join(runtimeDir, 'snapshots')
  return {
    checkpoint: path.join(runtimeDir, 'runtime-checkpoint.json'),
    summaries: path.join(runtimeDir, 'runtime-summaries.json'),
    reconciliationSnapshots: path.join(runtimeDir, 'reconciliation-snapshots.json'),
    events: path.join(runtimeDir, 'runtime-events.jsonl'),
    journal: path.join(runtimeDir, 'runtime-journal.jsonl'),
    snapshotDir,
  }
}

export function loadRuntimeEvents(filePath) {
  return readJsonLines(filePath)
}

export function loadRuntimeJournal(filePath) {
  return readJsonLines(filePath)
}

export function replayRuntimeLedger(paths) {
  const events = loadRuntimeEvents(paths.events)
  const journal = loadRuntimeJournal(paths.journal)
  const lastCheckpoint = readJson(paths.checkpoint, null)
  const lastSummaries = readJson(paths.summaries, { summaries: [] })
  const lastRecon = readJson(paths.reconciliationSnapshots, { snapshots: [] })
  return {
    eventCount: events.length,
    journalCount: journal.length,
    latestEvent: events[events.length - 1] || null,
    latestCheckpointId: lastCheckpoint?.checkpointId || null,
    latestSummaryId: lastSummaries.summaries?.[lastSummaries.summaries.length - 1]?.summaryId || null,
    latestReconciliationSnapshotId: lastRecon.snapshots?.[lastRecon.snapshots.length - 1]?.snapshotId || null,
    checksums: {
      checkpoint: lastCheckpoint ? checksumPayload(lastCheckpoint) : null,
      summaries: lastSummaries ? checksumPayload(lastSummaries) : null,
      reconciliationSnapshots: lastRecon ? checksumPayload(lastRecon) : null,
    },
  }
}

export function verifySummaryContinuity({ previous = null, summary = null } = {}) {
  if (!summary) return { ok: false, reason: 'missing_summary' }
  if (!previous) return { ok: true, unresolvedCarryForwardOk: true, resolvedClosureOk: true }
  const prev = new Map((previous.unresolvedItems || []).map((item) => [item.id, item]))
  const next = new Map((summary.unresolvedItems || []).map((item) => [item.id, item]))
  const preserved = [...prev.keys()].filter((id) => next.has(id)).length
  const closed = [...prev.keys()].filter((id) => !next.has(id)).length
  return {
    ok: preserved + closed === prev.size,
    unresolvedCarryForwardOk: preserved <= prev.size,
    resolvedClosureOk: closed >= 0,
    preserved,
    closed,
  }
}

export function buildRuntimeCheckpoint({
  state = {},
  queuePriorities = {},
  dependencyGraph = {},
  reconciliationQueues = {},
  executorForecast = {},
  observability = {},
  nextActions = {},
  now = new Date().toISOString(),
} = {}) {
  const priorities = queuePriorities.priorities || []
  return {
    checkpointId: `checkpoint_${Date.now()}`,
    generatedAt: now,
    restartEpoch: state.system?.restartEpoch || 0,
    sessionId: state.system?.sessionId || null,
    activeJobs: priorities.filter((j) => ['running', 'active'].includes(normalizeStatus(j.currentStatus || j.status))).map(summarizeJob),
    queuedJobs: priorities.filter((j) => normalizeStatus(j.currentStatus || j.status) === 'queued').map(summarizeJob),
    pausedJobs: priorities.filter((j) => String(j.currentStatus || j.status).includes('paused')).map(summarizeJob),
    blockedJobs: priorities.filter((j) => j.blockedReason).map(summarizeJob),
    dependencyGraphSummary: {
      nodes: dependencyGraph.topology?.nodes?.length || 0,
      edges: dependencyGraph.topology?.edges?.length || 0,
      blocked: dependencyGraph.blocked?.length || 0,
      orphanChains: dependencyGraph.orphanChains?.length || 0,
      unlockReady: dependencyGraph.unblockReady?.length || 0,
    },
    reconciliationQueueSummary: Object.fromEntries(Object.entries(reconciliationQueues.queues || {}).map(([k, v]) => [k, v.count || 0])),
    executorForecast,
    schedulerState: {
      nextActionsCount: nextActions.count || 0,
      mode: nextActions.mode || null,
    },
    localAIState: observability.localAIAvailability || { available: false },
    pendingReviewInboxCounts: {
      needsPatrick: reconciliationQueues.queues?.needs_patrick?.count || 0,
      needsPerry: reconciliationQueues.queues?.needs_perry?.count || 0,
    },
    nextRecommendedActions: (nextActions.nextActions || []).slice(0, 10),
  }
}

export function loadRuntimeCheckpoint(filePath) {
  return readJson(filePath, null)
}

export function saveRuntimeCheckpoint(filePath, checkpoint) {
  const paths = getRuntimeContinuityPaths(path.dirname(filePath))
  return recordArtifactWrite(paths, {
    kind: 'checkpoint',
    targetFile: filePath,
    value: checkpoint,
    metadata: { checkpointId: checkpoint.checkpointId, restartEpoch: checkpoint.restartEpoch, generatedAt: checkpoint.generatedAt },
  })
}

export function buildSnapshotExport({
  observability = {},
  queueTopology = {},
  recoveryState = {},
  budgetState = {},
  executorState = {},
  reconciliationDebt = {},
  archiveCandidates = {},
  factoryPipelineState = null,
  checkpoint = null,
  now = new Date().toISOString(),
} = {}) {
  return {
    exportedAt: now,
    runtimeHealth: observability,
    queueTopologySummary: {
      nodes: queueTopology.graph?.nodes?.length || 0,
      edges: queueTopology.graph?.edges?.length || 0,
      blockedChains: queueTopology.blockedChains?.length || 0,
      orphanChains: queueTopology.orphanChains?.length || 0,
      unlockReadyChains: queueTopology.unlockReadyChains?.length || 0,
    },
    recoveryState,
    budgetState,
    executorState,
    reconciliationDebt,
    archiveCandidatesSummary: archiveCandidates.summary || archiveCandidates,
    factoryPipelineState,
    checkpoint,
  }
}

export function loadRuntimeSummaries(filePath) {
  return readJson(filePath, { summaries: [] })
}

export function saveRuntimeSummaries(filePath, data) {
  const paths = getRuntimeContinuityPaths(path.dirname(filePath))
  return recordArtifactWrite(paths, {
    kind: 'summaries',
    targetFile: filePath,
    value: data,
    metadata: { latestSummaryId: data.summaries?.[data.summaries.length - 1]?.summaryId || null },
  })
}

export function buildRuntimeSummary({
  type = 'manual',
  previous = null,
  sourceEventCount = 0,
  generatedBy = 'mission-control',
  now = new Date().toISOString(),
  snapshot = {},
} = {}) {
  const unresolved = buildUnresolvedItems({
    queuePriorities: snapshot.queuePriorities || {},
    reconciliationQueues: snapshot.reconciliationQueues || {},
    nextActions: snapshot.nextActions || {},
  })
  const previousUnresolved = new Set((previous?.unresolvedItems || []).map((item) => item.id))
  const currentUnresolved = new Set(unresolved.map((item) => item.id))
  const unresolvedItemsPreserved = unresolved.filter((item) => previousUnresolved.has(item.id)).length
  const resolvedItemsClosed = previous ? (previous.unresolvedItems || []).filter((item) => !currentUnresolved.has(item.id)).length : 0
  const previousEventCount = previous?.sourceEventCount || 0
  const deltaEventCount = Math.max(0, sourceEventCount - previousEventCount)
  const major = previous ? previous.compressionVersion + 1 : 1
  return {
    summaryId: `summary_${Date.now()}`,
    previousSummaryId: previous?.summaryId || null,
    compressionVersion: major,
    type,
    coveredFrom: previous?.coveredTo || snapshot.coveredFrom || now,
    coveredTo: now,
    sourceEventCount,
    deltaEventCount,
    unresolvedItemsPreserved,
    resolvedItemsClosed,
    newRisks: (snapshot.risks || []).slice(0, 10),
    changedDecisions: (snapshot.decisions || []).slice(0, 10),
    nextActions: (snapshot.nextActions?.nextActions || []).slice(0, 10),
    confidence: snapshot.confidence || 'operational',
    generatedBy,
    updatedAt: now,
    unresolvedItems: unresolved,
    summary: {
      whatChanged: snapshot.whatChanged || [],
      shippedWork: snapshot.shippedWork || [],
      failures: snapshot.failures || [],
      blocked: snapshot.blocked || [],
      activeJobs: (snapshot.queuePriorities?.priorities || []).filter((item) => item.executable).slice(0, 15).map(summarizeJob),
      dependencySummary: snapshot.dependencySummary || {},
      risks: snapshot.risks || [],
    },
    sourceTrace: {
      queuePriorityCount: snapshot.queuePriorities?.priorities?.length || 0,
      reconciliationQueueTypes: Object.keys(snapshot.reconciliationQueues?.queues || {}),
      nextActionCount: snapshot.nextActions?.count || 0,
      eventCount: sourceEventCount,
    },
    superseded: false,
  }
}

export function applyIncrementalSummary({ store, summary }) {
  const data = store && Array.isArray(store.summaries) ? store : { summaries: [] }
  if (summary.previousSummaryId) {
    const prev = data.summaries.find((item) => item.summaryId === summary.previousSummaryId)
    if (prev) prev.superseded = true
  }
  data.summaries.push(summary)
  return data
}

export function buildCompactContext({ agent = 'nettie', latestSummary = null, queuePriorities = {}, dependencyGraph = {}, reconciliationQueues = {}, now = new Date().toISOString() } = {}) {
  const name = String(agent || '').toLowerCase()
  const priorities = (queuePriorities.priorities || []).filter((job) => {
    if (name === 'nettie') return true
    if (name === 'hermes') return ['manual_only', 'blocked_provider'].includes(job.recoveryClassification) || job.selectedExecutor === 'hermes'
    return [job.owner, job.departmentHead].map((v) => String(v || '').toLowerCase()).includes(name)
  }).slice(0, 25)
  return {
    agent: name,
    generatedAt: now,
    summary: latestSummary,
    relevantJobs: priorities.map(summarizeJob),
    blockers: priorities.filter((job) => job.blockedReason).slice(0, 10).map(summarizeJob),
    dependencies: {
      blocked: (dependencyGraph.blocked || []).slice(0, 10).map(summarizeJob),
      unblockReady: (dependencyGraph.unblockReady || []).slice(0, 10).map(summarizeJob),
    },
    reconciliation: Object.fromEntries(Object.entries(reconciliationQueues.queues || {}).map(([k, v]) => [k, v.count || 0])),
    nextActions: (latestSummary?.nextActions || []).slice(0, 10),
  }
}

export function buildContextEvictionCandidates({ summariesStore = { summaries: [] }, chat = [], logs = [], jobs = [], now = new Date().toISOString() } = {}) {
  const candidates = []
  const summaries = summariesStore.summaries || []
  for (const summary of summaries) {
    if (summary.superseded) {
      candidates.push({
        candidateType: 'summary',
        id: summary.summaryId,
        title: `${summary.type || 'summary'} ${summary.summaryId}`,
        classification: 'superseded',
        reason: 'A newer incremental summary exists.',
      })
    }
  }
  for (const job of jobs || []) {
    if (job.duplicateCandidate) {
      candidates.push({
        candidateType: 'job',
        id: job.id || job.jobId,
        title: job.title || job.task || 'Duplicate job',
        classification: 'duplicate',
        reason: 'Duplicate candidate should not remain in active runtime context.',
      })
    }
    if (String(job.sourceType || '').includes('test') || String(job.task || '').toLowerCase().includes('test')) {
      candidates.push({
        candidateType: 'job',
        id: job.id || job.jobId,
        title: job.title || job.task || 'Test job',
        classification: 'obsolete_test',
        reason: 'Old test/validation job can move to archive reference after review.',
      })
    }
  }
  if ((chat || []).length > 150) {
    candidates.push({
      candidateType: 'chat',
      id: 'chat-history',
      title: 'Long chat history',
      classification: 'archived_reference',
      reason: 'Chat history should be kept raw but shifted to cold reference after compaction.',
    })
  }
  if ((logs || []).length > 200) {
    candidates.push({
      candidateType: 'logs',
      id: 'runtime-logs',
      title: 'Large runtime logs',
      classification: 'archived_reference',
      reason: 'Logs remain append-only but older entries should be referenced through summaries.',
    })
  }
  return {
    generatedAt: now,
    destructive: false,
    candidates,
  }
}

export function loadReconciliationSnapshots(filePath) {
  return readJson(filePath, { snapshots: [] })
}

export function saveReconciliationSnapshots(filePath, data) {
  const paths = getRuntimeContinuityPaths(path.dirname(filePath))
  return recordArtifactWrite(paths, {
    kind: 'reconciliation_snapshots',
    targetFile: filePath,
    value: data,
    metadata: { latestSnapshotId: data.snapshots?.[data.snapshots.length - 1]?.snapshotId || null },
  })
}

export function buildReconciliationSnapshot({ reconciliationDebt = {}, reconciliationQueues = {}, dependencyGraph = {}, now = new Date().toISOString(), previous = null } = {}) {
  return {
    snapshotId: `recon_${Date.now()}`,
    generatedAt: now,
    debtScore: reconciliationDebt.reconciliationDebtScore || 0,
    queueCategoryCounts: Object.fromEntries(Object.entries(reconciliationQueues.queues || {}).map(([k, v]) => [k, v.count || 0])),
    topBlockers: (reconciliationDebt.topBlockers || []).slice(0, 10),
    safeToResumeCandidates: reconciliationQueues.queues?.safe_to_resume?.items || [],
    manualOnlyItems: reconciliationQueues.queues?.manual_only?.items || [],
    orphanDependencies: dependencyGraph.orphanChains || [],
    duplicateClusters: dependencyGraph.duplicateClusters || [],
    staleReviewItems: reconciliationQueues.queues?.stale_review?.items || [],
    previousSnapshotId: previous?.snapshotId || null,
    comparison: previous ? {
      debtDelta: (reconciliationDebt.reconciliationDebtScore || 0) - (previous.debtScore || 0),
      blockerDelta: (reconciliationDebt.topBlockers || []).length - (previous.topBlockers || []).length,
    } : null,
  }
}

export function buildSummaryDriftReport({ summariesStore = { summaries: [] } } = {}) {
  const summaries = summariesStore.summaries || []
  const latest = summaries[summaries.length - 1] || null
  const previous = latest?.previousSummaryId ? summaries.find((item) => item.summaryId === latest.previousSummaryId) : null
  const continuity = verifySummaryContinuity({ previous, summary: latest })
  return {
    generatedAt: new Date().toISOString(),
    summaryCount: summaries.length,
    latestSummaryId: latest?.summaryId || null,
    previousSummaryId: latest?.previousSummaryId || null,
    continuity,
    driftRiskScore: continuity.ok ? 0 : 80,
  }
}
