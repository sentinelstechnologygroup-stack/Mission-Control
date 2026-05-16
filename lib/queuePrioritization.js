function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
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

function collectOpenRegistryJobs(registry = {}) {
  return uniqueById([
    ...(registry.active || []),
    ...(registry.running || []),
    ...(registry.queued || []),
    ...(registry.paused || []),
    ...(registry.blocked || []),
  ])
}

function classifyTaskType(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.detail || ''} ${job.description || ''}`)
  if (/\b(code|build|debug|refactor|repo|api|backend|frontend|website|app|deploy)\b/.test(text)) return 'code'
  if (/\b(research|synthesis|document|policy|writing|copy|content|blog)\b/.test(text)) return 'writing'
  if (/\b(security|auth|secret|qa|risk|deployment|client facing|clientfacing|compliance)\b/.test(text)) return 'security'
  if (/\b(finance|financial|roi|budget|forecast|investment)\b/.test(text)) return 'finance'
  if (/\b(summary|rollup|status|triage|classification|compress|report)\b/.test(text)) return 'summarization'
  return 'ops'
}

function classifyRisk(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.detail || ''} ${job.description || ''}`)
  if (/\b(auth|secret|security|deployment|production|client facing|clientfacing|legal|financial|investment)\b/.test(text)) return 'high'
  if (/\b(build|code|repo|api|website|app|preview)\b/.test(text)) return 'medium'
  return 'low'
}

function classifyTokenCost(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.detail || ''} ${job.description || ''}`)
  if (/\b(summary|status|triage|classify|compress|rollup|report draft|draft)\b/.test(text) && !/\b(build|research|analyze|generate|full report)\b/.test(text)) return 'low'
  if (/\b(research|analyze|full report|generate|batch|scan)\b/.test(text)) return 'high'
  return 'medium'
}

function classifyPriorityBand(score) {
  if (score >= 90) return 'critical'
  if (score >= 70) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

function inferDepartmentHead(job = {}) {
  const raw = String(job.owner || job.agent || job.department || '').trim()
  if (raw) return raw
  const type = classifyTaskType(job)
  if (type === 'code') return 'Van'
  if (type === 'security') return 'Perry'
  if (type === 'finance') return 'Dana'
  if (type === 'writing') return 'Torina'
  return 'Nettie'
}

function requiresPerryReview(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.detail || ''} ${job.description || ''}`)
  return /\b(qa|security|risk|deployment|auth|secret|client facing|clientfacing)\b/.test(text)
}

function localAIDraftEligible(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.detail || ''} ${job.description || ''}`)
  const allowed = /\b(status|summary|summaries|queue|triage|report|draft|rollup|log|compression|classify|classification|routine|recurring)\b/.test(text)
  const blocked = /\b(production code|security|deployment|client facing|clientfacing|legal|financial|investment|high risk|auth|secret)\b/.test(text)
  return allowed && !blocked
}

function preferredExecutor(job = {}, { claudeValidated = false } = {}) {
  const type = classifyTaskType(job)
  if (localAIDraftEligible(job)) {
    return {
      preferredExecutor: 'local_ai',
      selectedExecutor: 'local_ai',
      executorPolicy: 'draft_only',
      selectedBecause: 'Low-risk triage/reporting task eligible for local-AI first-pass handling.',
      localAIFinalAllowed: false,
    }
  }
  if (type === 'writing') {
    return claudeValidated
      ? {
          preferredExecutor: 'claude_cli',
          selectedExecutor: 'claude_cli',
          executorPolicy: 'preferred',
          selectedBecause: 'Long-context writing/research task and Claude route is validated.',
          localAIFinalAllowed: false,
        }
      : {
          preferredExecutor: 'claude_cli',
          selectedExecutor: 'gpt_codex',
          executorPolicy: 'fallback',
          selectedBecause: 'Claude route is not validated here; use governed GPT/Codex fallback for stronger review lane.',
          localAIFinalAllowed: false,
        }
  }
  return {
    preferredExecutor: 'gpt_codex',
    selectedExecutor: 'gpt_codex',
    executorPolicy: 'preferred',
    selectedBecause: 'Technical/build work belongs in the GPT/Codex lane.',
    localAIFinalAllowed: false,
  }
}

function buildReviewChain(job = {}) {
  const departmentHead = inferDepartmentHead(job)
  const chain = [
    { stage: 'agent_employee', owner: job.owner || job.agent || departmentHead, required: true },
    { stage: 'department_head', owner: departmentHead, required: true },
  ]
  if (requiresPerryReview(job) && departmentHead !== 'Perry') {
    chain.push({ stage: 'perry_review', owner: 'Perry', required: true })
  }
  if (departmentHead === 'Perry') {
    chain.push({ stage: 'perry_review', owner: 'Perry', required: true })
  }
  chain.push({ stage: 'nettie_final_assembly', owner: 'Nettie', required: true })
  chain.push({ stage: 'patrick_delivery', owner: 'Patrick', required: true })
  return chain
}

function baseScoreForStatus(job = {}) {
  const status = normalizeStatus(job.status)
  const routeStatus = String(job.routeStatus || '').toLowerCase()
  if (routeStatus === 'reconciliation_required') return 10
  if (status === 'running') return 92
  if (status === 'queued') return 70
  if (status === 'paused') return 35
  if (status === 'blocked') return 15
  if (status === 'active') return 80
  return 25
}

function executionDisposition(job = {}, recoveryMeta = null, dependencyMeta = null) {
  const status = normalizeStatus(job.status)
  const routeStatus = String(job.routeStatus || '').toLowerCase()
  const recoveryClassification = recoveryMeta?.recoveryClassification || null
  const autoResumeAllowed = Boolean(recoveryMeta?.autoResumeAllowed)

  if (dependencyMeta?.dependencyStatus === 'blocked_by_dependency') {
    return {
      executable: false,
      blockedReason: 'dependency_blocked',
      nextAction: dependencyMeta.dependencyReason || `Wait for blockers: ${(dependencyMeta.blockedBy || []).join(', ')}`,
    }
  }

  if (recoveryClassification === 'manual_only') {
    return { executable: false, blockedReason: 'manual_only', nextAction: 'Keep in manual-only queue for department-head handling.' }
  }
  if (recoveryClassification === 'blocked_needs_patrick') {
    return { executable: false, blockedReason: 'patrick_approval_required', nextAction: 'Escalate to Patrick before execution.' }
  }
  if (recoveryClassification === 'blocked_provider') {
    return { executable: false, blockedReason: 'provider_blocked', nextAction: 'Wait for provider recovery and rerun reconciliation.' }
  }
  if (recoveryClassification === 'duplicate') {
    return { executable: false, blockedReason: 'duplicate', nextAction: 'Resolve duplicate/open work collision before execution.' }
  }
  if (recoveryClassification === 'already_running_elsewhere') {
    return { executable: false, blockedReason: 'already_running_elsewhere', nextAction: 'Monitor existing live execution; do not launch again.' }
  }
  if (recoveryClassification === 'stale_needs_review') {
    return { executable: false, blockedReason: 'stale_needs_review', nextAction: 'Review stale lifecycle state before requeue.' }
  }
  if (routeStatus === 'reconciliation_required') {
    return { executable: false, blockedReason: 'reconciliation_required', nextAction: 'Resolve reconciliation gate before execution intake or auto-resume.' }
  }
  if (status === 'blocked') {
    return { executable: false, blockedReason: 'blocked', nextAction: job.nextAction || 'Resolve blocker before execution.' }
  }
  if (status === 'paused' && !autoResumeAllowed) {
    return { executable: false, blockedReason: 'paused_not_safe_to_resume', nextAction: job.nextAction || 'Keep paused until safe-to-resume criteria are satisfied.' }
  }
  return { executable: status === 'queued' || status === 'running' || status === 'active', blockedReason: null, nextAction: job.nextAction || (status === 'queued' ? 'Ready for routed execution.' : 'Monitor in current lane.') }
}

export function buildDailyRollupPolicy() {
  return {
    scheduleLocalTime: '23:00',
    scheduleCron: '0 23 * * *',
    draftExecutor: 'local_ai',
    draftLabelWhenFallback: 'local-draft',
    reliabilityRule: 'late_is_better_than_missed',
    requiredSections: [
      'completed_work',
      'running_work',
      'queued_work',
      'blocked_work',
      'cooldown_provider_state',
      'recovery_gate_state',
      'safe_to_resume_items',
      'manual_only_or_patrick_needed_items',
      'agent_workload',
      'next_10_recommended_actions',
      'overnight_work_recommendations',
      'risks_blockers',
    ],
    reviewChain: [
      'local_ai_draft',
      'department_head_summaries',
      'perry_blocker_flags',
      'nettie_final_assembly',
      'patrick_email_delivery',
    ],
  }
}

export function buildQueuePriorities({ registry = {}, recoveryReport = null, dependencyGraph = null, claudeValidated = false, now = new Date().toISOString() } = {}) {
  const jobs = collectOpenRegistryJobs(registry)
  const recoveryMap = new Map((recoveryReport?.jobs || []).map((job) => [String(job.jobId), job]))
  const dependencyMap = new Map((dependencyGraph?.topology?.nodes || []).map((node) => [String(node.jobId), node]))

  const priorities = jobs.map((job) => {
    const recoveryMeta = recoveryMap.get(String(job.id || job.jobId || '')) || null
    const dependencyMeta = dependencyMap.get(String(job.id || job.jobId || '')) || null
    const disposition = executionDisposition(job, recoveryMeta, dependencyMeta)
    const routing = preferredExecutor(job, { claudeValidated })
    const tokenCost = classifyTokenCost(job)
    const riskLevel = classifyRisk(job)
    let score = baseScoreForStatus(job)
    if (disposition.executable) score += 10
    if (tokenCost === 'low') score += 6
    if (riskLevel === 'high') score -= 5
    if (localAIDraftEligible(job)) score += 4
    if (!disposition.executable) score -= 25
    if (recoveryMeta?.recoveryClassification === 'safe_to_resume') score += 8
    if (recoveryReport?.reconciliationRequired) score -= 3

    const overnightRecommended = tokenCost === 'high' && disposition.executable
    const departmentHead = inferDepartmentHead(job)
    return {
      jobId: job.id || job.jobId,
      title: job.task || job.title || 'Untitled mission',
      owner: job.owner || job.agent || departmentHead,
      departmentHead,
      currentStatus: normalizeStatus(job.status),
      routeStatus: job.routeStatus || null,
      sourceType: job.sourceType || 'mission-control',
      lastUpdated: job.updatedAt || job.createdAt || now,
      taskType: classifyTaskType(job),
      riskLevel,
      tokenCost,
      priorityScore: score,
      priorityBand: classifyPriorityBand(score),
      executable: disposition.executable,
      blockedReason: disposition.blockedReason,
      recommendedAction: disposition.nextAction,
      dependsOn: Array.isArray(dependencyMeta?.dependsOn) ? dependencyMeta.dependsOn : (Array.isArray(job.dependsOn) ? job.dependsOn : []),
      blockedBy: Array.isArray(dependencyMeta?.blockedBy) ? dependencyMeta.blockedBy : [],
      dependencyStatus: dependencyMeta?.dependencyStatus || null,
      unlocks: Array.isArray(dependencyMeta?.unlocks) ? dependencyMeta.unlocks : [],
      recoveryClassification: recoveryMeta?.recoveryClassification || null,
      autoResumeAllowed: Boolean(recoveryMeta?.autoResumeAllowed),
      autoResumeReason: recoveryMeta?.autoResumeReason || null,
      localAIDraftEligible: localAIDraftEligible(job),
      preferredExecutor: routing.preferredExecutor,
      selectedExecutor: routing.selectedExecutor,
      executorPolicy: routing.executorPolicy,
      selectedBecause: routing.selectedBecause,
      localAIFinalAllowed: routing.localAIFinalAllowed,
      overnightRecommended,
      reviewChain: buildReviewChain(job),
    }
  }).sort((a, b) => b.priorityScore - a.priorityScore || String(b.lastUpdated).localeCompare(String(a.lastUpdated)))

  return {
    generatedAt: now,
    reconciliationRequired: Boolean(recoveryReport?.reconciliationRequired),
    dailyRollupPolicy: buildDailyRollupPolicy(),
    counts: {
      total: priorities.length,
      executable: priorities.filter((item) => item.executable).length,
      blocked: priorities.filter((item) => !item.executable).length,
      localAIDraftEligible: priorities.filter((item) => item.localAIDraftEligible).length,
      overnightRecommended: priorities.filter((item) => item.overnightRecommended).length,
    },
    priorities,
  }
}

export function buildTopNextActions(priorities = [], { limit = 10 } = {}) {
  const executable = (priorities || []).filter((item) => item.executable)
  const fallbackBlocked = (priorities || []).filter((item) => !item.executable)
  const source = executable.length ? executable : fallbackBlocked
  const top = source
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      jobId: item.jobId,
      title: item.title,
      owner: item.owner,
      departmentHead: item.departmentHead,
      selectedExecutor: item.selectedExecutor,
      priorityScore: item.priorityScore,
      tokenCost: item.tokenCost,
      overnightRecommended: item.overnightRecommended,
      recommendedAction: item.recommendedAction,
      blockedReason: item.blockedReason || null,
      executable: item.executable,
      reviewChain: clone(item.reviewChain),
    }))

  return {
    generatedAt: new Date().toISOString(),
    count: top.length,
    mode: executable.length ? 'executable' : 'blocked_resolution',
    nextActions: top,
  }
}
