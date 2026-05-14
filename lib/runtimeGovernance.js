import fs from 'fs'
import path from 'path'

const RECOVERY_TASK_RE = /\b(recovery|diagnostic|diagnostics|health check|heartbeat|bridge check|cooldown recovery|restore|resume controller|provider health)\b/i
const LOW_COST_RE = /\b(status|brief|summary|health|registry|report|diagnostic|check|validate|local-only|local only|lint|typecheck|build metadata)\b/i
const HIGH_COST_RE = /\b(build|implement|generate|analyze|research|scan|scrape|write code|refactor|execute|ship|deploy|autonomous|project execution)\b/i
const PROVIDER_DEPENDENT_RE = /\b(model|provider|codex|openai|claude|llm|chat completion|generate|analyze|research)\b/i

function nowIso() {
  return new Date().toISOString()
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function defaultClaudeCliAssessment() {
  return {
    route: 'claude_cli',
    reliable: false,
    status: 'manual_only',
    mode: 'break_glass_only',
    investigatedAt: '2026-05-14T00:00:00.000Z',
    version: 'Claude Code 2.1.138',
    reasons: [
      'auth_status_mismatch',
      'noninteractive_output_is_metadata_noisy',
      'error_semantics_require_payload_parsing_beyond_exit_code',
    ],
    summary: 'Claude CLI is not reliable enough for governed core routing on this machine. Leave manual break-glass only.',
  }
}

export function defaultGovernanceState(system = {}) {
  return {
    mc_governed: true,
    break_glass_mode: false,
    last_mc_heartbeat: system.updatedAt || system.launchedAt || nowIso(),
    allowed_actions: ['governed_execution', 'queue_management', 'cooldown_pause', 'recovery_diagnostics'],
    cooldown: {
      active: false,
      provider: null,
      model: null,
      startedAt: null,
      resetEta: null,
      retryDelaySeconds: null,
      reliableFallbackAvailable: false,
      pausedJobIds: [],
      resumedJobIds: [],
      missedRecurringJobIds: [],
    },
    claude_cli: defaultClaudeCliAssessment(),
  }
}

export function loadGovernanceState(filePath, system = {}) {
  const fallback = defaultGovernanceState(system)
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return {
      ...fallback,
      ...parsed,
      cooldown: { ...fallback.cooldown, ...(parsed.cooldown || {}) },
      claude_cli: { ...fallback.claude_cli, ...(parsed.claude_cli || {}) },
    }
  } catch {
    return fallback
  }
}

export function saveGovernanceState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2))
}

function jobText(job = {}) {
  return `${job.task || job.title || ''} ${job.description || ''} ${job.inputPayload?.task || ''} ${job.inputPayload?.text || ''}`.toLowerCase()
}

export function classifyJobTokenCost(job = {}) {
  const text = jobText(job)
  if (!text.trim()) return 'medium'
  if (LOW_COST_RE.test(text) && !HIGH_COST_RE.test(text)) return 'low'
  if (HIGH_COST_RE.test(text)) return 'high'
  return 'medium'
}

export function isLocalOnlyTask(job = {}) {
  const text = jobText(job)
  return /\b(local|localhost|wsl|runtime|shell|lint|typecheck|diagnostic|registry|health|build metadata|no production changes)\b/.test(text)
}

export function isProviderDependentJob(job = {}) {
  if (job.inputPayload?.providerDependent === false) return false
  const text = jobText(job)
  return HIGH_COST_RE.test(text) || PROVIDER_DEPENDENT_RE.test(text)
}

export function evaluateHermesGovernance({
  mcRuntimeOnline = true,
  breakGlassMode = false,
  hasApprovedOperatorCommand = false,
  hasJobRecord = false,
  actionType = 'project_execution',
  task = '',
} = {}) {
  const recoveryOnly = actionType === 'recovery_diagnostic' || RECOVERY_TASK_RE.test(String(task || ''))
  const allowedActions = breakGlassMode
    ? ['recovery_diagnostics']
    : ['governed_execution', 'queue_management', 'cooldown_pause', 'recovery_diagnostics']

  if (!mcRuntimeOnline) {
    if (breakGlassMode && recoveryOnly) {
      return {
        allowed: true,
        mc_governed: false,
        break_glass_mode: true,
        allowed_actions: allowedActions,
        reason: 'MC offline; break-glass recovery diagnostics allowed.',
      }
    }
    return {
      allowed: false,
      mc_governed: false,
      break_glass_mode: breakGlassMode,
      allowed_actions: ['recovery_diagnostics'],
      reason: 'MC offline; normal Hermes execution is blocked outside break-glass recovery.',
    }
  }

  if (breakGlassMode) {
    return {
      allowed: recoveryOnly,
      mc_governed: false,
      break_glass_mode: true,
      allowed_actions: allowedActions,
      reason: recoveryOnly ? 'Break-glass mode permits recovery diagnostics only.' : 'Break-glass mode blocks normal project execution.',
    }
  }

  if (!hasJobRecord && !hasApprovedOperatorCommand) {
    return {
      allowed: false,
      mc_governed: true,
      break_glass_mode: false,
      allowed_actions: allowedActions,
      reason: 'Normal Hermes execution requires a Mission Control job record or approved operator command.',
    }
  }

  return {
    allowed: true,
    mc_governed: true,
    break_glass_mode: false,
    allowed_actions: allowedActions,
    reason: 'Governed Hermes execution allowed by Mission Control.',
  }
}

export function updateGovernanceHeartbeat(governanceState = {}, system = {}) {
  return {
    ...clone(governanceState),
    mc_governed: true,
    last_mc_heartbeat: system.updatedAt || system.launchedAt || nowIso(),
  }
}

export function recordCooldown(governanceState = {}, cooldown = null, { reliableFallbackAvailable = false, now = nowIso() } = {}) {
  const next = clone(governanceState)
  next.cooldown = { ...(next.cooldown || defaultGovernanceState().cooldown) }
  if (!cooldown) {
    next.cooldown.active = false
    next.cooldown.provider = null
    next.cooldown.model = null
    next.cooldown.resetEta = null
    next.cooldown.retryDelaySeconds = null
    next.cooldown.reliableFallbackAvailable = reliableFallbackAvailable
    return next
  }
  next.cooldown.active = true
  next.cooldown.provider = cooldown.provider || null
  next.cooldown.model = cooldown.model || null
  next.cooldown.startedAt = next.cooldown.startedAt || now
  next.cooldown.resetEta = cooldown.estimatedResetTime || null
  next.cooldown.retryDelaySeconds = cooldown.retryDelaySeconds ?? null
  next.cooldown.reliableFallbackAvailable = reliableFallbackAvailable
  return next
}

export function applyCooldownPauseToJobs(jobs = [], governanceState = {}, { now = nowIso() } = {}) {
  const nextJobs = clone(jobs)
  const pausedJobIds = []
  const cooldown = governanceState.cooldown || {}
  if (!cooldown.active || cooldown.reliableFallbackAvailable) {
    return { jobs: nextJobs, pausedJobIds }
  }

  for (const job of nextJobs) {
    const tokenCost = classifyJobTokenCost(job)
    const localOnly = isLocalOnlyTask(job)
    const providerDependent = isProviderDependentJob(job)
    const status = String(job.status || '').toLowerCase()
    if (!providerDependent || (localOnly && tokenCost === 'low')) continue
    if (!['queued', 'running', 'active'].includes(status)) continue

    job.status = 'paused'
    job.routeStatus = 'paused_provider_blocked'
    job.providerOutage = true
    job.outageReason = `provider cooldown active (${cooldown.provider || 'provider'})`
    job.recoveryNote = 'Paused during provider cooldown to avoid retry burn.'
    job.nextAction = cooldown.resetEta ? `Resume after cooldown clears (${cooldown.resetEta}).` : 'Resume after provider health recovers.'
    job.resumeCommand = `resume ${job.id}`
    job.tokenCostClass = tokenCost
    job.updatedAt = now
    pausedJobIds.push(job.id)
  }

  return { jobs: nextJobs, pausedJobIds }
}

export function recoverPausedProviderBlockedJobs(jobs = [], governanceState = {}, { providerHealthy = true, now = nowIso() } = {}) {
  const nextJobs = clone(jobs)
  const resumedJobIds = []
  const cooldown = governanceState.cooldown || {}
  if (cooldown.active || !providerHealthy) {
    return { jobs: nextJobs, resumedJobIds }
  }

  for (const job of nextJobs) {
    if (String(job.routeStatus || '') !== 'paused_provider_blocked') continue
    job.status = 'queued'
    job.routeStatus = 'resumed_after_cooldown'
    job.providerOutage = false
    job.recoveryNote = 'Requeued after cooldown controller confirmed provider recovery.'
    job.nextAction = 'Dispatch when executor health check passes.'
    job.updatedAt = now
    resumedJobIds.push(job.id)
  }

  return { jobs: nextJobs, resumedJobIds }
}

export function recoverStaleRunningJobs(jobs = [], { now = nowIso(), timeoutMs = 60 * 60 * 1000 } = {}) {
  const nextJobs = clone(jobs)
  const staleJobIds = []
  const nowMs = Date.parse(now)
  for (const job of nextJobs) {
    const status = String(job.status || '').toLowerCase()
    if (!['running', 'active'].includes(status)) continue
    const heartbeat = Date.parse(job.heartbeatAt || job.updatedAt || job.createdAt || 0)
    if (!Number.isFinite(heartbeat) || nowMs - heartbeat <= timeoutMs) continue
    job.status = 'paused'
    job.routeStatus = 'recoverable_stale'
    job.recoveryNote = 'Marked recoverable/stale after worker heartbeat timeout.'
    job.nextAction = 'Review worker state and requeue if safe.'
    job.updatedAt = now
    staleJobIds.push(job.id)
  }
  return { jobs: nextJobs, staleJobIds }
}

export function reconcileRecurringRecovery(jobs = [], { now = nowIso(), cooldownActive = false, runtimeOutage = false, providerHealthy = true } = {}) {
  const nextJobs = clone(jobs)
  const createdLateRuns = []
  const missedJobIds = []
  for (const job of nextJobs) {
    const recurring = job.recurring && typeof job.recurring === 'object' ? job.recurring : null
    if (!recurring?.enabled || !recurring.nextRunAt) continue
    const nextRunMs = Date.parse(recurring.nextRunAt)
    const nowMs = Date.parse(now)
    if (!Number.isFinite(nextRunMs) || nextRunMs > nowMs) continue

    if (cooldownActive || runtimeOutage) {
      recurring.lastOutcome = 'missed_due_to_cooldown'
      recurring.lastMissedAt = now
      recurring.pendingLateRun = true
      missedJobIds.push(job.id)
      continue
    }

    if (recurring.pendingLateRun && providerHealthy) {
      createdLateRuns.push({
        ...clone(job),
        id: `${job.id}__late__${String(nowMs).slice(-8)}`,
        status: 'queued',
        routeStatus: 'resumed_late',
        createdAt: now,
        updatedAt: now,
        parentRecurringJobId: job.id,
        recurring: {
          ...recurring,
          lateExecution: true,
          lastOutcome: 'resumed_late',
          lastResumedAt: now,
          pendingLateRun: false,
        },
      })
      recurring.lastOutcome = 'resumed_late'
      recurring.lastResumedAt = now
      recurring.pendingLateRun = false
    }
  }
  return { jobs: nextJobs, createdLateRuns, missedJobIds }
}

export function markRecurringRunCompletedLate(job = {}, { now = nowIso() } = {}) {
  const next = clone(job)
  if (next.recurring && next.recurring.lateExecution) {
    next.recurring.lastOutcome = 'completed_late'
    next.recurring.lastCompletedLateAt = now
    next.routeStatus = 'completed_late'
  }
  return next
}

export function buildGovernedExecutorStatus(baseStatus = {}, governanceState = {}, { mcRuntimeOnline = true } = {}) {
  const governance = governanceState || defaultGovernanceState()
  const hermesPolicy = evaluateHermesGovernance({
    mcRuntimeOnline,
    breakGlassMode: Boolean(governance.break_glass_mode),
    hasApprovedOperatorCommand: true,
    hasJobRecord: true,
    actionType: 'project_execution',
  })

  return {
    ...baseStatus,
    mc_governed: Boolean(governance.mc_governed),
    break_glass_mode: Boolean(governance.break_glass_mode),
    last_mc_heartbeat: governance.last_mc_heartbeat || null,
    allowed_actions: clone(hermesPolicy.allowed_actions || governance.allowed_actions || []),
    claude_cli: clone(governance.claude_cli || defaultClaudeCliAssessment()),
  }
}
