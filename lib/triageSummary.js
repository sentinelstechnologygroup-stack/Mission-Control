function summarizeArtifacts(reportsStatus = {}) {
  const recent = Array.isArray(reportsStatus.recent) ? reportsStatus.recent : []
  const stale = Array.isArray(reportsStatus.stale) ? reportsStatus.stale : []
  const newestArtifacts = recent.slice(0, 5).map((report) => ({
    id: report.id || report.title,
    title: report.title,
    updatedAt: report.updatedAt || report.createdAt || null,
    truthStatus: report.truthStatus || 'UNKNOWN',
  }))
  const staleArtifacts = stale.slice(0, 5).map((report) => ({
    id: report.id || report.title,
    title: report.title,
    updatedAt: report.updatedAt || report.createdAt || null,
    truthStatus: report.truthStatus || 'UNKNOWN',
  }))
  return {
    newestArtifacts,
    staleArtifacts,
    unlinkedArtifacts: [],
    reportFreshness: {
      total: reportsStatus.total || 0,
      staleCount: reportsStatus.staleCount || 0,
    },
  }
}

export function buildTriageSummary({
  runtimeHealth = {},
  reconciliation = {},
  locks = {},
  queueSummary = {},
  reportsStatus = {},
  activityFeed = [],
  nextActions = [],
  now = new Date().toISOString(),
} = {}) {
  const queuePressure = {
    queued: queueSummary.totalQueued ?? reconciliation.sourceCounts?.queued ?? 0,
    running: queueSummary.totalRunning ?? reconciliation.sourceCounts?.running ?? 0,
    blocked: queueSummary.totalBlocked ?? reconciliation.sourceCounts?.blocked ?? 0,
    stale: reconciliation.sourceCounts?.stale ?? queueSummary.staleJobs?.length ?? 0,
    completed: reconciliation.sourceCounts?.completed ?? queueSummary.totalCompleted ?? 0,
    activeWorkMismatch: (reconciliation.mismatches || []).some((item) => item.type === 'active_work_open_count_mismatch'),
  }

  const topRisks = [
    ...(reconciliation.impossibleStates || []).slice(0, 3).map((item) => `Impossible state: ${item.type}`),
    ...(locks.lockConflicts || []).slice(0, 2).map((item) => `Lock conflict: ${item.jobId}`),
    ...((reportsStatus.staleCount || 0) ? [`${reportsStatus.staleCount} stale reports are still in circulation.`] : []),
  ].slice(0, 6)

  const activeIncidents = []
  if (runtimeHealth.overallHealth && runtimeHealth.overallHealth !== 'HEALTHY') activeIncidents.push(`Runtime ${runtimeHealth.overallHealth}`)
  if (runtimeHealth.executorTruth && runtimeHealth.executorTruth !== 'LIVE') activeIncidents.push(`Executor ${runtimeHealth.executorTruth}`)
  if ((locks.lockConflicts || []).length) activeIncidents.push(`Lock conflicts ${(locks.lockConflicts || []).length}`)
  if ((reconciliation.orphanJobs || []).length) activeIncidents.push(`Orphan jobs ${(reconciliation.orphanJobs || []).length}`)
  if ((reconciliation.staleJobs || []).length) activeIncidents.push(`Stale jobs ${(reconciliation.staleJobs || []).length}`)

  const operatorRecommendations = [
    ...(reconciliation.recommendedActions || []),
    ...((locks.recommendedActions || []).slice(0, 2)),
  ].slice(0, 8)

  const truthStatus = [runtimeHealth.truthStatus, reconciliation.truthStatus].includes('DEGRADED') ? 'DEGRADED' : 'LIVE'

  return {
    updatedAt: now,
    truthStatus,
    runtimeHealth,
    reconciliation,
    queuePressure,
    blockerBreakdown: reconciliation.blockerBreakdown || [],
    lockGovernance: locks,
    staleJobs: reconciliation.staleJobs || [],
    staleReports: reportsStatus.stale || [],
    orphanJobs: reconciliation.orphanJobs || [],
    topRisks,
    nextActions: nextActions.nextActions || nextActions || [],
    activeIncidents,
    cooldownStatus: {
      executorTruth: runtimeHealth.executorTruth || 'UNKNOWN',
      degradedSystems: runtimeHealth.degradedSystems || [],
    },
    artifactFreshness: summarizeArtifacts(reportsStatus),
    activityFeed: Array.isArray(activityFeed) ? activityFeed.slice(0, 12) : [],
    operatorRecommendations,
  }
}
