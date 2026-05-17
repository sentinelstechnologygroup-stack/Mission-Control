function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeStatus(status = '') {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'in_progress' || s === 'in-progress') return 'running'
  if (s === 'done') return 'complete'
  return s || 'queued'
}

function uniqueById(items = []) {
  const byId = new Map()
  for (const item of items || []) {
    const id = String(item?.id || item?.jobId || '').trim()
    if (!id) continue
    const prev = byId.get(id)
    const prevTs = String(prev?.updatedAt || prev?.createdAt || '')
    const nextTs = String(item.updatedAt || item.createdAt || '')
    if (!prev || nextTs >= prevTs) byId.set(id, item)
  }
  return Array.from(byId.values())
}

function normalizeDependsOn(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)))
}

function isTerminal(status = '') {
  return new Set(['complete', 'completed', 'cancelled', 'archived']).has(normalizeStatus(status))
}

function isOpen(status = '') {
  return new Set(['queued', 'running', 'active', 'paused', 'blocked']).has(normalizeStatus(status))
}

function inferPolluting(job = {}) {
  const text = `${job.task || job.title || ''} ${job.description || ''}`.toLowerCase()
  return /\b(test|validation|smoke|ping only|executor status test)\b/.test(text)
    || String(job.routeStatus || '').toLowerCase() === 'recoverable_stale'
    || String(job.recoveryClassification || '').toLowerCase() === 'duplicate'
}

function jobRow(job = {}, overrides = {}) {
  return {
    jobId: job.id || job.jobId,
    title: job.task || job.title || 'Untitled mission',
    owner: job.owner || job.agent || job.department || 'Unassigned',
    status: normalizeStatus(job.status),
    routeStatus: job.routeStatus || null,
    dependsOn: normalizeDependsOn(job.dependsOn),
    blockedBy: normalizeDependsOn(overrides.blockedBy !== undefined ? overrides.blockedBy : job.blockedBy),
    dependencyStatus: overrides.dependencyStatus || job.dependencyStatus || (normalizeDependsOn(job.dependsOn).length ? 'waiting_for_dependencies' : 'ready'),
    dependencyReason: overrides.dependencyReason !== undefined ? overrides.dependencyReason : (job.dependencyReason || null),
    unlocks: Array.isArray(overrides.unlocks) ? overrides.unlocks : (Array.isArray(job.unlocks) ? job.unlocks : []),
    unblockReady: overrides.unblockReady !== undefined ? Boolean(overrides.unblockReady) : Boolean(job.unblockReady),
    polluting: overrides.polluting !== undefined ? Boolean(overrides.polluting) : inferPolluting(job),
    sourceType: job.sourceType || 'mission-control',
    updatedAt: job.updatedAt || job.createdAt || null,
  }
}

export function buildDependencyGraph({ jobs = [], now = new Date().toISOString() } = {}) {
  const deduped = uniqueById(jobs)
  const byId = new Map(deduped.map((job) => [String(job.id || job.jobId), job]))
  const downstream = new Map()

  for (const job of deduped) {
    for (const depId of normalizeDependsOn(job.dependsOn)) {
      const rows = downstream.get(depId) || []
      rows.push(String(job.id || job.jobId))
      downstream.set(depId, rows)
    }
  }

  const nodes = deduped.map((job) => {
    const id = String(job.id || job.jobId)
    const dependsOn = normalizeDependsOn(job.dependsOn)
    const blockers = dependsOn.filter((depId) => {
      const upstream = byId.get(depId)
      return !upstream || !isTerminal(upstream.status)
    })
    const missingDependencies = dependsOn.filter((depId) => !byId.has(depId))
    const dependencyStatus = !dependsOn.length
      ? 'ready'
      : missingDependencies.length
        ? 'orphan_dependency'
        : blockers.length
          ? 'blocked_by_dependency'
          : (isOpen(job.status) ? 'unblock_ready' : 'dependency_satisfied')
    return jobRow(job, {
      blockedBy: blockers,
      dependencyStatus,
      dependencyReason: missingDependencies.length
        ? `Missing prerequisites: ${missingDependencies.join(', ')}`
        : (blockers.length ? `Waiting on ${blockers.join(', ')}` : (dependsOn.length ? 'All prerequisites satisfied.' : null)),
      unlocks: Array.from(new Set((downstream.get(id) || []).filter(Boolean))),
      unblockReady: dependencyStatus === 'unblock_ready',
      polluting: inferPolluting(job),
    })
  })

  const edges = []
  for (const node of nodes) {
    for (const depId of node.dependsOn) {
      edges.push({ from: depId, to: node.jobId, type: 'depends_on' })
    }
  }

  return {
    generatedAt: now,
    blocked: nodes.filter((node) => node.dependencyStatus === 'blocked_by_dependency' || node.dependencyStatus === 'orphan_dependency'),
    unblockReady: nodes.filter((node) => node.dependencyStatus === 'unblock_ready'),
    orphanChains: nodes.filter((node) => node.dependencyStatus === 'orphan_dependency'),
    polluted: nodes.filter((node) => node.polluting),
    topology: {
      nodes,
      edges,
    },
  }
}

export function getJobDependencyView(graph = {}, jobId = '') {
  const needle = String(jobId || '').trim()
  const node = (graph.topology?.nodes || []).find((entry) => entry.jobId === needle) || null
  if (!node) return null
  const upstream = (graph.topology?.nodes || []).filter((entry) => node.dependsOn.includes(entry.jobId))
  const downstream = (graph.topology?.nodes || []).filter((entry) => entry.dependsOn.includes(node.jobId))
  return {
    ...clone(node),
    upstream,
    downstream,
  }
}

export function buildCooldownBlockedListArtifact({ queuePriorities = null, dependencyGraph = null, recoveryReport = null, now = new Date().toISOString() } = {}) {
  const priorities = Array.isArray(queuePriorities?.priorities) ? queuePriorities.priorities : []
  const recoveryJobs = Array.isArray(recoveryReport?.jobs) ? recoveryReport.jobs : []
  const dependencyBlockedJobs = Array.isArray(dependencyGraph?.blocked) ? dependencyGraph.blocked : []
  return {
    name: 'mission-control-ledger-queue-blocked-list',
    generatedAt: now,
    reviewRequired: true,
    sections: {
      queuedJobs: priorities.filter((job) => job.currentStatus === 'queued').slice(0, 100),
      blockedJobs: priorities.filter((job) => !job.executable).slice(0, 100),
      pausedJobs: priorities.filter((job) => job.currentStatus === 'paused').slice(0, 100),
      runningOrStaleJobs: priorities.filter((job) => job.currentStatus === 'running' || job.blockedReason === 'stale_needs_review').slice(0, 100),
      safeToResumeCandidates: recoveryJobs.filter((job) => job.recoveryClassification === 'safe_to_resume').slice(0, 100),
      manualOnlyCandidates: recoveryJobs.filter((job) => job.recoveryClassification === 'manual_only').slice(0, 100),
      dependencyBlockedJobs: dependencyBlockedJobs.slice(0, 100),
      localAIEligibleJobs: priorities.filter((job) => job.localAIDraftEligible).slice(0, 100),
      deepThinkingJobs: priorities.filter((job) => job.selectedExecutor === 'gpt_codex' || job.selectedExecutor === 'claude_cli').slice(0, 100),
      recommendedNextActions: priorities.slice(0, 10).map((job) => ({
        jobId: job.jobId,
        title: job.title,
        recommendedAction: job.recommendedAction,
        selectedExecutor: job.selectedExecutor,
      })),
    },
  }
}
