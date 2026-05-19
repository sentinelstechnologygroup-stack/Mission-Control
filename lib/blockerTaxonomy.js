function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s:_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeStatus(value = '') {
  const status = normalizeText(value)
  if (status === 'in progress' || status === 'in_progress' || status === 'in-progress') return 'running'
  if (status === 'done') return 'complete'
  if (status === 'stopped') return 'blocked'
  return status || 'queued'
}

function jobAgeHours(job = {}, now = new Date().toISOString()) {
  const stamp = Date.parse(job.updatedAt || job.heartbeatAt || job.createdAt || now)
  const current = Date.parse(now)
  if (!Number.isFinite(stamp) || !Number.isFinite(current)) return 0
  return Math.max(0, (current - stamp) / 3600000)
}

function buildReasonFragments(job = {}) {
  return normalizeText([
    job.blockedReason,
    job.routeStatus,
    job.status,
    job.source,
    job.sourceType,
    job.task,
    job.title,
    job.detail,
    job.description,
    job.recoveryNote,
    job.nextAction,
    job.dependencyReason,
    job.lockReason,
    job.outageReason,
    job.error,
  ].filter(Boolean).join(' | '))
}

function blockerTemplate(blockerClass, reason, recommendedAction, severity = 'medium') {
  return {
    blockerClass,
    blockerReason: reason,
    recommendedAction,
    severity,
  }
}

export function classifyBlockedJob(job = {}, { executorState = {}, now = new Date().toISOString() } = {}) {
  const status = normalizeStatus(job.status)
  const text = buildReasonFragments(job)
  const ageHours = jobAgeHours(job, now)
  const hasLockMetadata = Boolean(job.lockSession || job.lockOwner || job.lockReason || /lock conflict|job_locked|claimed_by_local_bridge|heartbeat/i.test(text))

  if (/security|perry review|required review|vulnerability|qa gate|guardrail|risk review/.test(text)) {
    return {
      ...blockerTemplate('BLOCKED_SECURITY', 'Security or QA review required.', 'Route to Perry review and clear the security gate first.', 'high'),
      ageHours,
    }
  }

  if (/cooldown|rate limit|provider blocked|paused_provider_blocked|quota|token outage/.test(text) || executorState?.executorCoolingDown) {
    return {
      ...blockerTemplate('BLOCKED_COOLDOWN', 'Executor or provider cooldown is preventing progress.', 'Wait for provider recovery or use an approved fallback lane.', 'high'),
      ageHours,
    }
  }

  if (/dependency|blocked_by_dependency|orphan_dependency|unblock_ready/.test(text) || Array.isArray(job.blockedBy) && job.blockedBy.length > 0) {
    const orphaned = /orphan/.test(text)
    return {
      ...blockerTemplate(orphaned ? 'BLOCKED_ORPHANED' : 'BLOCKED_DEPENDENCY', orphaned ? 'Job is orphaned from its dependency chain.' : 'Job is blocked by an unresolved dependency.', orphaned ? 'Reattach the job to its source dependency chain before promotion.' : 'Clear the blocking dependency before execution.', 'high'),
      ageHours,
    }
  }

  if (/auth|credential|secret|bridge token|invalid_bridge_token|missing_bridge_token/.test(text)) {
    return {
      ...blockerTemplate('BLOCKED_AUTH', 'Authentication or credential issue detected.', 'Repair auth configuration or bridge credentials before retry.', 'high'),
      ageHours,
    }
  }

  if (hasLockMetadata) {
    return {
      ...blockerTemplate('BLOCKED_LOCK_CONFLICT', 'Job lock conflict or lock ownership mismatch detected.', 'Inspect active lock ownership before requeueing or manual recovery.', 'high'),
      ageHours,
    }
  }

  if (/runtime|reconciliation_required|executor unavailable|bridge unavailable|worker|heartbeat expired|recoverable_stale/.test(text) || status === 'recoverable_stale') {
    return {
      ...blockerTemplate('BLOCKED_RUNTIME', 'Runtime or reconciliation state is preventing safe execution.', 'Reconcile runtime state and worker ownership before resuming.', 'high'),
      ageHours,
    }
  }

  if (/patrick|approval required|manual only|human review|client facing|production deploy|deploy production|billing|legal/.test(text)) {
    return {
      ...blockerTemplate('BLOCKED_HUMAN', 'Human approval or principal sign-off required.', 'Escalate for approval before continuing.', 'medium'),
      ageHours,
    }
  }

  if (/resource|capacity|budget|cost|disk|memory|cpu|funding/.test(text)) {
    return {
      ...blockerTemplate('BLOCKED_RESOURCE', 'Resource or capacity constraint detected.', 'Resolve resource pressure before retry.', 'medium'),
      ageHours,
    }
  }

  if (status === 'failed' && /stale|test|validation|smoke|ping/.test(text) || ageHours >= 24 && /stale|recoverable_stale|heartbeat expired/.test(text)) {
    return {
      ...blockerTemplate('BLOCKED_STALE', 'Stale or expired work item requires review before reuse.', 'Review stale debt and archive or refresh safely.', 'medium'),
      ageHours,
    }
  }

  if (/orphan|registry only|project-ledger only/.test(text)) {
    return {
      ...blockerTemplate('BLOCKED_ORPHANED', 'Job appears orphaned from durable runtime state.', 'Reconnect the orphaned record to a canonical ledger source or archive after review.', 'medium'),
      ageHours,
    }
  }

  return {
    ...blockerTemplate('BLOCKED_UNKNOWN', 'Blocked state could not be classified with certainty.', 'Inspect the job manually and assign a canonical blocker class.', 'medium'),
    ageHours,
  }
}

export function classifyBlockedJobs(jobs = [], options = {}) {
  return (jobs || []).map((job) => ({ ...job, ...classifyBlockedJob(job, options) }))
}

export function buildBlockerBreakdown(jobs = [], options = {}) {
  const classified = classifyBlockedJobs(jobs, options)
  const groups = new Map()

  for (const job of classified) {
    const blockerClass = job.blockerClass || 'BLOCKED_UNKNOWN'
    const current = groups.get(blockerClass) || {
      blockerClass,
      count: 0,
      severity: job.severity || 'medium',
      recommendedAction: job.recommendedAction || 'Inspect manually.',
      examples: [],
    }
    current.count += 1
    if (current.examples.length < 3) {
      current.examples.push({
        jobId: job.jobId || job.id,
        task: job.task || job.title || 'Untitled job',
        owner: job.owner || job.agent || job.department || 'Unknown',
        blockerReason: job.blockerReason,
        routeStatus: job.routeStatus || null,
        updatedAt: job.updatedAt || job.createdAt || null,
      })
    }
    groups.set(blockerClass, current)
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.blockerClass.localeCompare(b.blockerClass))
}
