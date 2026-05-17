function normalizeStatus(status = '') {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'in_progress' || s === 'in-progress') return 'running'
  if (s === 'done') return 'complete'
  return s || 'queued'
}

function ageDays(job = {}, now = new Date().toISOString()) {
  const start = Date.parse(job.completedAt || job.updatedAt || job.createdAt || now)
  const current = Date.parse(now)
  if (!Number.isFinite(start) || !Number.isFinite(current)) return 0
  return Math.max(0, (current - start) / 86400000)
}

function textFor(job = {}) {
  return `${job.task || job.title || ''} ${job.description || ''}`.toLowerCase()
}

function summarizeQueueItem(item = {}) {
  return {
    jobId: item.jobId,
    title: item.title,
    owner: item.owner,
    blockedReason: item.blockedReason || null,
    recoveryClassification: item.recoveryClassification || null,
    staleClassification: item.staleClassification || null,
    recommendedAction: item.recommendedAction || null,
    selectedExecutor: item.selectedExecutor || null,
    priorityScore: item.priorityScore ?? null,
  }
}

export function buildObservabilityView({
  platformHealth = {},
  executorStatus = {},
  queuePriorities = {},
  reconciliationDebt = {},
  dependencyGraph = {},
  restartState = {},
  workers = [],
  now = new Date().toISOString(),
} = {}) {
  const successfulHeartbeats = (workers || [])
    .filter((worker) => ['running', 'completed'].includes(String(worker.status || '').toLowerCase()))
    .map((worker) => worker.endedAt || worker.startedAt || worker.updatedAt)
    .filter(Boolean)
    .sort()
  return {
    generatedAt: now,
    mcOnline: platformHealth.backend === 'healthy',
    bridgeOnline: Boolean(executorStatus.bridgeOnline || executorStatus.bridgeConnected),
    executorState: {
      executor: executorStatus.executor,
      ready: executorStatus.executorReady,
      coolingDown: executorStatus.executorCoolingDown,
      cooldown: executorStatus.cooldown || null,
      fallback: executorStatus.fallback || null,
    },
    localAIAvailability: {
      available: Boolean(executorStatus.localAIAvailable),
      nettieLocalFallback: executorStatus.nettieLocalFallback || null,
    },
    deepWorkState: executorStatus.deepWorkPaused ? 'paused' : 'active',
    localWorkState: executorStatus.localWorkActive ? 'active' : 'idle',
    reconciliationDebtScore: reconciliationDebt.reconciliationDebtScore || 0,
    workCounts: {
      open: queuePriorities.counts?.total || 0,
      running: platformHealth.counts?.running || 0,
      queued: platformHealth.counts?.queued || 0,
      blocked: platformHealth.counts?.blocked || 0,
      stale: queuePriorities.counts?.staleRecovery || 0,
    },
    dependencyHealth: {
      blocked: dependencyGraph.blocked?.length || 0,
      orphan: dependencyGraph.orphanChains?.length || 0,
      unblockReady: dependencyGraph.unblockReady?.length || 0,
      edges: dependencyGraph.topology?.edges?.length || 0,
      nodes: dependencyGraph.topology?.nodes?.length || 0,
    },
    lockConflicts: (queuePriorities.priorities || []).filter((job) => job.blockedReason === 'job_locked').length,
    memoryPressure: restartState.memoryPressure || null,
    restartState: {
      restartEpoch: restartState.restartEpoch,
      sessionId: restartState.sessionId,
      preRestartRunningJobs: restartState.preRestartRunningJobs || [],
    },
    lastSuccessfulWorkerHeartbeat: successfulHeartbeats.slice(-1)[0] || null,
  }
}

export function buildReconciliationQueuesView({ queuePriorities = {}, reconciliationDebt = {}, now = new Date().toISOString() } = {}) {
  const priorities = queuePriorities.priorities || []
  const queues = {
    safe_to_resume: priorities.filter((job) => job.recoveryClassification === 'safe_to_resume'),
    duplicate_resolution: priorities.filter((job) => job.duplicateCandidate || job.recoveryClassification === 'duplicate' || job.blockedReason === 'duplicate_candidate'),
    stale_review: priorities.filter((job) => job.staleClassification || job.blockedReason === 'stale_needs_review'),
    orphan_dependency: priorities.filter((job) => job.dependencyReadiness === 'orphan_dependency' || job.blockedReason === 'orphan_dependency'),
    manual_only: priorities.filter((job) => job.recoveryClassification === 'manual_only' || job.blockedReason === 'manual_only'),
    blocked_provider: priorities.filter((job) => job.recoveryClassification === 'blocked_provider' || job.blockedReason === 'provider_blocked'),
    needs_patrick: priorities.filter((job) => job.recoveryClassification === 'blocked_needs_patrick' || job.blockedReason === 'patrick_approval_required'),
    needs_perry: priorities.filter((job) => (job.requiredReviewChain || []).some((entry) => entry.stage === 'perry_review')),
    already_running_elsewhere: priorities.filter((job) => job.recoveryClassification === 'already_running_elsewhere'),
  }
  return {
    generatedAt: now,
    reconciliationDebtScore: reconciliationDebt.reconciliationDebtScore || 0,
    queues: Object.fromEntries(Object.entries(queues).map(([key, items]) => [key, {
      count: items.length,
      items: items.map(summarizeQueueItem),
    }])),
  }
}

export function buildArchiveCandidatesView({ ledgerJobs = [], staleArchive = [], now = new Date().toISOString() } = {}) {
  const candidates = []
  for (const job of ledgerJobs || []) {
    const status = normalizeStatus(job.status)
    const text = textFor(job)
    const age = ageDays(job, now)
    if (job.duplicateCandidate || String(job.blockedReason || '') === 'duplicate_candidate') {
      candidates.push({ jobId: job.id || job.jobId, title: job.task || job.title, category: 'duplicate_candidate', recommendedAction: 'Review duplicate cluster and compact after approval.' })
      continue
    }
    if (status === 'failed' && age >= 7 && /test|validation|smoke|ping/.test(text)) {
      candidates.push({ jobId: job.id || job.jobId, title: job.task || job.title, category: 'old_failed_test_job', recommendedAction: 'Archive to cold history after review.' })
      continue
    }
    if ((status === 'complete' || status === 'completed' || status === 'cancelled') && age >= 14) {
      candidates.push({ jobId: job.id || job.jobId, title: job.task || job.title, category: 'stale_completed_job', recommendedAction: 'Archive summary candidate only; preserve audit trail.' })
    }
  }
  return {
    generatedAt: now,
    candidates,
    existingArchiveEntries: staleArchive.length,
  }
}

export function buildArchiveCompactionDryRun({ ledgerJobs = [], staleArchive = [], now = new Date().toISOString() } = {}) {
  const view = buildArchiveCandidatesView({ ledgerJobs, staleArchive, now })
  const byCategory = view.candidates.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {})
  return {
    mode: 'dry_run',
    generatedAt: now,
    summary: {
      totalCandidates: view.candidates.length,
      byCategory,
      existingArchiveEntries: staleArchive.length,
    },
    candidates: view.candidates,
  }
}

export function buildQueueTopologyView({ dependencyGraph = {}, queuePriorities = {}, now = new Date().toISOString() } = {}) {
  const priorities = queuePriorities.priorities || []
  const graph = dependencyGraph.topology || { nodes: [], edges: [] }
  const duplicateMap = new Map()
  const staleMap = new Map()
  const ownerMap = new Map()

  for (const job of priorities) {
    if (job.canonicalFingerprint && job.duplicateRisk === 'high') {
      const list = duplicateMap.get(job.canonicalFingerprint) || []
      list.push(summarizeQueueItem(job))
      duplicateMap.set(job.canonicalFingerprint, list)
    }
    if (job.staleClassification) {
      const list = staleMap.get(job.staleClassification) || []
      list.push(summarizeQueueItem(job))
      staleMap.set(job.staleClassification, list)
    }
    const owner = job.departmentHead || job.owner || 'Unassigned'
    const list = ownerMap.get(owner) || []
    list.push(summarizeQueueItem(job))
    ownerMap.set(owner, list)
  }

  return {
    generatedAt: now,
    graph,
    blockedChains: (dependencyGraph.blocked || []).map(summarizeQueueItem),
    orphanChains: (dependencyGraph.orphanChains || []).map(summarizeQueueItem),
    unlockReadyChains: (dependencyGraph.unblockReady || []).map(summarizeQueueItem),
    duplicateClusters: Array.from(duplicateMap.entries()).map(([fingerprint, items]) => ({ fingerprint, items })),
    staleClusters: Array.from(staleMap.entries()).map(([classification, items]) => ({ classification, items })),
    ownerGroups: Array.from(ownerMap.entries()).map(([owner, items]) => ({ owner, count: items.length, items: items.slice(0, 25) })),
  }
}
