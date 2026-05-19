import { classifyBlockedJobs, buildBlockerBreakdown } from './blockerTaxonomy.js'

function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s:_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function uniqueById(items = []) {
  const map = new Map()
  for (const item of items || []) {
    const id = String(item?.jobId || item?.id || '').trim()
    if (!id) continue
    if (!map.has(id)) map.set(id, item)
  }
  return Array.from(map.values())
}

function registryOpenJobs(registry = {}) {
  return uniqueById([
    ...(registry.active || []),
    ...(registry.running || []),
    ...(registry.queued || []),
    ...(registry.paused || []),
    ...(registry.blocked || []),
  ])
}

function ageHours(item = {}, now = new Date().toISOString()) {
  const stamp = Date.parse(item.updatedAt || item.heartbeatAt || item.createdAt || now)
  const current = Date.parse(now)
  if (!Number.isFinite(stamp) || !Number.isFinite(current)) return 0
  return Math.max(0, (current - stamp) / 3600000)
}

function sourceCountsFromRegistry(registry = {}) {
  const open = registryOpenJobs(registry)
  return {
    registryTotal: open.length,
    queued: Array.isArray(registry.queued) ? registry.queued.length : 0,
    running: Array.isArray(registry.running) ? registry.running.length : 0,
    blocked: Array.isArray(registry.blocked) ? registry.blocked.length : 0,
    completed: Array.isArray(registry.completedRecent) ? registry.completedRecent.length : 0,
  }
}

function buildTaskFingerprint(job = {}) {
  return `${normalizeText(job.owner || job.agent || job.department || '')}|${normalizeText(job.task || job.title || '')}`
}

function buildDuplicateJobs(openJobs = []) {
  const groups = new Map()
  for (const job of openJobs) {
    const fingerprint = buildTaskFingerprint(job)
    if (!fingerprint || fingerprint === '|') continue
    const list = groups.get(fingerprint) || []
    list.push(job)
    groups.set(fingerprint, list)
  }

  return Array.from(groups.entries())
    .filter(([, jobs]) => jobs.length > 1)
    .map(([fingerprint, jobs]) => ({
      fingerprint,
      count: jobs.length,
      jobs: jobs.map((job) => ({
        jobId: job.jobId || job.id,
        task: job.task || job.title || 'Untitled job',
        owner: job.owner || job.agent || job.department || 'Unknown',
        status: job.status || 'unknown',
        routeStatus: job.routeStatus || null,
        source: job.source || null,
        updatedAt: job.updatedAt || job.createdAt || null,
      })),
    }))
    .sort((a, b) => b.count - a.count)
}

function buildOrphanJobs(openJobs = [], ledgerJobs = []) {
  const ledgerIds = new Set((ledgerJobs || []).map((job) => String(job.jobId || job.id || '').trim()).filter(Boolean))
  return openJobs
    .filter((job) => {
      const id = String(job.jobId || job.id || '').trim()
      if (!id) return false
      if (ledgerIds.has(id)) return false
      return !/project-ledger|recovery-ledger/i.test(String(job.sourceType || job.routeStatus || ''))
    })
    .map((job) => ({
      jobId: job.jobId || job.id,
      task: job.task || job.title || 'Untitled job',
      owner: job.owner || job.agent || job.department || 'Unknown',
      status: job.status || 'unknown',
      routeStatus: job.routeStatus || null,
      source: job.source || null,
      sourceType: job.sourceType || null,
      updatedAt: job.updatedAt || job.createdAt || null,
    }))
}

function buildStaleJobs(openJobs = [], now = new Date().toISOString(), staleAfterHours = 12) {
  return openJobs
    .filter((job) => ageHours(job, now) >= staleAfterHours || /stale|recoverable_stale|heartbeat expired/i.test(`${job.status || ''} ${job.routeStatus || ''} ${job.recoveryNote || ''}`))
    .map((job) => ({
      jobId: job.jobId || job.id,
      task: job.task || job.title || 'Untitled job',
      owner: job.owner || job.agent || job.department || 'Unknown',
      status: job.status || 'unknown',
      routeStatus: job.routeStatus || null,
      ageHours: Math.round(ageHours(job, now)),
      updatedAt: job.updatedAt || job.createdAt || null,
    }))
    .sort((a, b) => b.ageHours - a.ageHours)
}

export function buildRuntimeLocksSummary({ ledgerJobs = [], registry = {}, now = new Date().toISOString() } = {}) {
  const openJobs = registryOpenJobs(registry)
  const allJobs = uniqueById([...(ledgerJobs || []), ...openJobs])
  const activeLocks = []
  const staleLocks = []
  const lockConflicts = []

  for (const job of allJobs) {
    const hasLockData = job.lockOwner || job.lockSession || job.lockReason || job.lockExpiresAt
    const title = `${job.task || job.title || ''} ${job.routeStatus || ''} ${job.blockedReason || ''}`
    const expiryMs = Date.parse(job.lockExpiresAt || '')
    const expired = Number.isFinite(expiryMs) ? expiryMs <= Date.now() : false

    if (hasLockData && !expired) {
      activeLocks.push({
        jobId: job.jobId || job.id,
        task: job.task || job.title || 'Untitled job',
        owner: job.owner || job.agent || job.department || 'Unknown',
        lockOwner: job.lockOwner || null,
        lockSession: job.lockSession || null,
        lockReason: job.lockReason || null,
        lockExpiresAt: job.lockExpiresAt || null,
      })
    }

    if (hasLockData && expired) {
      staleLocks.push({
        jobId: job.jobId || job.id,
        task: job.task || job.title || 'Untitled job',
        owner: job.owner || job.agent || job.department || 'Unknown',
        lockOwner: job.lockOwner || null,
        lockSession: job.lockSession || null,
        lockReason: job.lockReason || null,
        lockExpiresAt: job.lockExpiresAt || null,
      })
    }

    if (/lock conflict|job_locked|claimed_by_local_bridge|lock/i.test(title)) {
      lockConflicts.push({
        jobId: job.jobId || job.id,
        task: job.task || job.title || 'Untitled job',
        owner: job.owner || job.agent || job.department || 'Unknown',
        status: job.status || 'unknown',
        routeStatus: job.routeStatus || null,
        lockOwner: job.lockOwner || null,
        lockSession: job.lockSession || null,
        updatedAt: job.updatedAt || job.createdAt || null,
      })
    }
  }

  const affectedJobs = uniqueById([...activeLocks, ...staleLocks, ...lockConflicts]).map((job) => job.jobId)
  const owners = Array.from(new Set([...activeLocks, ...staleLocks, ...lockConflicts].map((job) => job.owner).filter(Boolean))).sort()
  const recommendedActions = []
  if (lockConflicts.length) recommendedActions.push('Review lock conflict clusters before starting additional local-bridge work.')
  if (staleLocks.length) recommendedActions.push('Clear or reclassify stale locks only after confirming no live worker still owns the job.')
  if (!recommendedActions.length) recommendedActions.push('No immediate lock intervention required; keep monitoring.')

  return {
    updatedAt: now,
    truthStatus: 'LIVE',
    overallStatus: lockConflicts.length || staleLocks.length ? 'DEGRADED' : 'HEALTHY',
    activeLocks,
    lockConflicts,
    staleLocks,
    affectedJobs,
    owners,
    recommendedActions,
  }
}

function buildImpossibleStates({ registry = {}, activeWorkView = {}, ledgerJobs = [] } = {}) {
  const impossibleStates = []
  const bucketEntries = []
  for (const bucket of ['active', 'running', 'queued', 'paused', 'blocked']) {
    for (const job of registry[bucket] || []) {
      const id = String(job.jobId || job.id || '').trim()
      if (!id) continue
      bucketEntries.push({ id, bucket, status: job.status || 'unknown' })
    }
  }

  const bucketMap = new Map()
  for (const item of bucketEntries) {
    const list = bucketMap.get(item.id) || []
    list.push(item.bucket)
    bucketMap.set(item.id, list)
  }
  for (const [id, buckets] of bucketMap.entries()) {
    const uniqueBuckets = Array.from(new Set(buckets))
    if (uniqueBuckets.length > 1) impossibleStates.push({ type: 'multi_bucket_job', jobId: id, buckets: uniqueBuckets })
  }

  const openCount = registryOpenJobs(registry).length
  if (typeof activeWorkView?.count === 'number' && activeWorkView.count !== openCount) {
    impossibleStates.push({ type: 'active_work_mismatch', activeWorkCount: activeWorkView.count, registryOpenCount: openCount })
  }

  for (const job of ledgerJobs || []) {
    const status = String(job.status || '').toLowerCase()
    if (!['complete', 'completed', 'cancelled', 'failed'].includes(status)) continue
    const appearsOpen = bucketMap.has(String(job.jobId || job.id || '').trim())
    if (appearsOpen) {
      impossibleStates.push({ type: 'terminal_job_still_open', jobId: job.jobId || job.id, status })
    }
  }

  return impossibleStates
}

export function buildRuntimeReconciliation({
  ledgerJobs = [],
  registry = {},
  activeWorkView = {},
  queueSummary = {},
  blockedJobs = [],
  recentActivity = [],
  reportStatus = {},
  snapshot = {},
  executorState = {},
  now = new Date().toISOString(),
} = {}) {
  const openRegistryJobs = registryOpenJobs(registry)
  const sourceCounts = {
    ledgerTotal: (ledgerJobs || []).length,
    ...sourceCountsFromRegistry(registry),
    activeWorkTotal: Number(activeWorkView?.count || 0),
    stale: buildStaleJobs(openRegistryJobs, now).length,
  }

  const classifiedBlockedJobs = classifyBlockedJobs(blockedJobs, { executorState, now })
  const blockerBreakdown = buildBlockerBreakdown(blockedJobs, { executorState, now })
  const duplicateJobs = buildDuplicateJobs(openRegistryJobs)
  const orphanJobs = buildOrphanJobs(openRegistryJobs, ledgerJobs)
  const staleJobs = buildStaleJobs(openRegistryJobs, now)
  const lockSummary = buildRuntimeLocksSummary({ ledgerJobs, registry, now })
  const impossibleStates = buildImpossibleStates({ registry, activeWorkView, ledgerJobs })

  const mismatches = []
  if ((queueSummary.totalQueued ?? sourceCounts.queued) !== sourceCounts.queued) {
    mismatches.push({ type: 'queued_count_mismatch', queueSummary: queueSummary.totalQueued ?? null, registry: sourceCounts.queued })
  }
  if ((queueSummary.totalRunning ?? sourceCounts.running) !== sourceCounts.running) {
    mismatches.push({ type: 'running_count_mismatch', queueSummary: queueSummary.totalRunning ?? null, registry: sourceCounts.running })
  }
  if ((queueSummary.totalBlocked ?? sourceCounts.blocked) !== sourceCounts.blocked) {
    mismatches.push({ type: 'blocked_count_mismatch', queueSummary: queueSummary.totalBlocked ?? null, registry: sourceCounts.blocked })
  }
  if (Number(activeWorkView?.count || 0) !== openRegistryJobs.length) {
    mismatches.push({ type: 'active_work_open_count_mismatch', activeWork: activeWorkView?.count ?? null, registryOpen: openRegistryJobs.length })
  }
  if ((reportStatus.staleCount || 0) > 0) {
    mismatches.push({ type: 'stale_reports_present', staleReports: reportStatus.staleCount })
  }
  if (Array.isArray(recentActivity)) {
    const ledgerIds = new Set((ledgerJobs || []).map((job) => String(job.jobId || job.id || '').trim()))
    const danglingActivity = recentActivity.filter((entry) => entry?.type === 'job' && entry?.id && !ledgerIds.has(String(entry.id).trim()))
    if (danglingActivity.length) mismatches.push({ type: 'activity_feed_orphans', count: danglingActivity.length })
  }
  if (snapshot && snapshot.queuePriorities?.counts?.total && snapshot.queuePriorities.counts.total !== openRegistryJobs.length) {
    mismatches.push({ type: 'snapshot_queue_total_mismatch', snapshot: snapshot.queuePriorities.counts.total, registryOpen: openRegistryJobs.length })
  }

  const recommendedActions = []
  if (duplicateJobs.length) recommendedActions.push('Collapse duplicate open-job clusters before promoting more work.')
  if (orphanJobs.length) recommendedActions.push('Reconcile orphan jobs against the durable ledger or project-ledger sources.')
  if (lockSummary.lockConflicts.length) recommendedActions.push('Resolve lock conflicts before scheduling new local-bridge execution.')
  if (staleJobs.length) recommendedActions.push('Review stale debt and archive or refresh stale runtime records safely.')
  if ((reportStatus.staleCount || 0) > 0) recommendedActions.push('Refresh stale reports so triage does not rely on expired artifacts.')
  if (impossibleStates.length) recommendedActions.push('Stop treating all runtime sources as aligned until impossible states are reconciled.')
  if (!recommendedActions.length) recommendedActions.push('Sources are aligned enough for operator use; continue monitoring drift.')

  const safeAutoFixesAvailable = []
  if (staleJobs.some((job) => /test|validation|smoke|ping/i.test(job.task))) safeAutoFixesAvailable.push('archive_stale_test_jobs_dry_run')
  if (lockSummary.staleLocks.length) safeAutoFixesAvailable.push('stale_lock_review_plan')
  if ((reportStatus.staleCount || 0) > 0) safeAutoFixesAvailable.push('report_refresh_plan')

  const criticalSignals = impossibleStates.length + lockSummary.lockConflicts.length + orphanJobs.length
  const truthStatus = criticalSignals || mismatches.length ? 'DEGRADED' : 'LIVE'
  const overallStatus = criticalSignals > 3 ? 'CRITICAL' : criticalSignals > 0 || staleJobs.length || sourceCounts.blocked ? 'DEGRADED' : 'HEALTHY'

  return {
    updatedAt: now,
    truthStatus,
    overallStatus,
    sourceCounts,
    mismatches,
    duplicateJobs,
    orphanJobs,
    staleJobs,
    lockConflicts: lockSummary.lockConflicts,
    impossibleStates,
    recommendedActions,
    safeAutoFixesAvailable,
    requiresHumanApproval: Boolean(duplicateJobs.length || orphanJobs.length || impossibleStates.length),
    classifiedBlockedJobs,
    blockerBreakdown,
  }
}
