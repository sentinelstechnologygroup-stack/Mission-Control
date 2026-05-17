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

export function buildReviewChain(job = {}) {
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

function buildJobFingerprint(job = {}) {
  return [
    normalizeText(job.owner || job.agent || job.department || ''),
    normalizeText(job.sourceType || job.source || ''),
    normalizeText(job.task || job.title || ''),
  ].join('|')
}

function ageHours(job = {}, now = new Date().toISOString()) {
  const created = Date.parse(job.createdAt || job.updatedAt || now)
  const current = Date.parse(now)
  if (!Number.isFinite(created) || !Number.isFinite(current)) return 0
  return Math.max(0, (current - created) / 3600000)
}

function starvationRiskLevel(hours = 0) {
  if (hours >= 72) return 'high'
  if (hours >= 24) return 'medium'
  return 'low'
}

function recoveryLikelihoodFor(job = {}, recoveryMeta = null) {
  const classification = recoveryMeta?.recoveryClassification || ''
  if (classification === 'safe_to_resume') return 'high'
  if (classification === 'stale_needs_review' || classification === 'blocked_provider') return 'medium'
  if (classification === 'duplicate' || classification === 'manual_only' || classification === 'already_running_elsewhere') return 'low'
  return 'medium'
}

function confidenceFor(job = {}, routing = null) {
  if (routing?.selectedExecutor === 'local_ai') return 'medium'
  if (classifyRisk(job) === 'high') return 'high'
  return 'medium'
}

function urgencyFor(job = {}, hours = 0) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.detail || ''} ${job.description || ''}`)
  if (/\b(urgent|asap|today|immediately|critical|hotfix)\b/.test(text)) return 'critical'
  if (hours >= 72) return 'high'
  if (hours >= 24) return 'medium'
  return 'normal'
}

function staleClassification(job = {}, now = new Date().toISOString()) {
  const hours = ageHours(job, now)
  const status = normalizeStatus(job.status)
  const routeStatus = String(job.routeStatus || '').toLowerCase()
  if (routeStatus === 'recoverable_stale') return 'recoverable_stale'
  if (hours < 24) return null
  if (status === 'queued') return 'stale_queued'
  if (status === 'running') return 'stale_running'
  if (status === 'paused') return 'stale_paused'
  if (status === 'failed' || status === 'blocked') return 'stale_failed'
  return null
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

function executionDisposition(job = {}, recoveryMeta = null, dependencyMeta = null, riskMeta = {}) {
  const status = normalizeStatus(job.status)
  const routeStatus = String(job.routeStatus || '').toLowerCase()
  const recoveryClassification = recoveryMeta?.recoveryClassification || null
  const autoResumeAllowed = Boolean(recoveryMeta?.autoResumeAllowed)

  if (dependencyMeta?.dependencyStatus === 'orphan_dependency') {
    return {
      executable: false,
      blockedReason: 'orphan_dependency',
      nextAction: dependencyMeta.dependencyReason || 'Relink dependency, create missing prerequisite, or waive with Patrick/Nettie approval.',
    }
  }

  if (dependencyMeta?.dependencyStatus === 'blocked_by_dependency') {
    return {
      executable: false,
      blockedReason: 'dependency_blocked',
      nextAction: dependencyMeta.dependencyReason || `Wait for blockers: ${(dependencyMeta.blockedBy || []).join(', ')}`,
    }
  }

  if (riskMeta.duplicateCandidate) {
    return {
      executable: false,
      blockedReason: 'duplicate_candidate',
      nextAction: 'Resolve duplicate candidate set and keep only the canonical active job in the executable lane.',
    }
  }

  if (riskMeta.lockActive) {
    return {
      executable: false,
      blockedReason: 'job_locked',
      nextAction: `Wait for execution lock to expire or request override from ${riskMeta.lockOwner || 'owner'}.`,
    }
  }

  if (riskMeta.staleClass && recoveryClassification !== 'safe_to_resume') {
    return {
      executable: false,
      blockedReason: riskMeta.staleClass === 'recoverable_stale' ? 'stale_needs_review' : riskMeta.staleClass,
      nextAction: 'Review stale job state before execution or resume.',
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

export function buildReconciliationDebtView({ recoveryReport = null, queuePriorities = null, now = new Date().toISOString() } = {}) {
  const unresolved = (recoveryReport?.jobs || []).filter((job) => job.recoveryClassification && job.recoveryClassification !== 'safe_to_resume')
  const topBlockers = (queuePriorities?.priorities || [])
    .filter((job) => !job.executable)
    .slice(0, 10)
    .map((job) => ({
      jobId: job.jobId,
      title: job.title,
      blockedReason: job.blockedReason,
      recommendedAction: job.recommendedAction,
    }))
  return {
    generatedAt: now,
    reconciliationDebtCount: unresolved.length,
    reconciliationDebtScore: unresolved.length * 10,
    topBlockers,
  }
}

export function buildQueuePriorities({ registry = {}, recoveryReport = null, dependencyGraph = null, claudeValidated = false, now = new Date().toISOString() } = {}) {
  const jobs = collectOpenRegistryJobs(registry)
  const recoveryMap = new Map((recoveryReport?.jobs || []).map((job) => [String(job.jobId), job]))
  const dependencyMap = new Map((dependencyGraph?.topology?.nodes || []).map((node) => [String(node.jobId), node]))
  const fingerprintGroups = new Map()

  for (const job of jobs) {
    const fingerprint = buildJobFingerprint(job)
    const list = fingerprintGroups.get(fingerprint) || []
    list.push(job)
    fingerprintGroups.set(fingerprint, list)
  }

  const canonicalByFingerprint = new Map()
  for (const [fingerprint, items] of fingerprintGroups.entries()) {
    const running = items.filter((item) => ['running', 'active'].includes(normalizeStatus(item.status)))
    const source = running.length ? running : items
    const chosen = source.sort((a, b) => {
      const aCreated = String(a.createdAt || a.updatedAt || '')
      const bCreated = String(b.createdAt || b.updatedAt || '')
      if (running.length) return aCreated.localeCompare(bCreated)
      const aUpdated = String(a.updatedAt || a.createdAt || '')
      const bUpdated = String(b.updatedAt || b.createdAt || '')
      return bUpdated.localeCompare(aUpdated)
    })[0]
    canonicalByFingerprint.set(fingerprint, String(chosen.id || chosen.jobId || ''))
  }

  let priorities = jobs.map((job) => {
    const recoveryMeta = recoveryMap.get(String(job.id || job.jobId || '')) || null
    const dependencyMeta = dependencyMap.get(String(job.id || job.jobId || '')) || null
    const fingerprint = buildJobFingerprint(job)
    const canonicalJobId = canonicalByFingerprint.get(fingerprint) || String(job.id || job.jobId || '')
    const duplicateCount = (fingerprintGroups.get(fingerprint) || []).length
    const duplicateCandidate = duplicateCount > 1
    const staleClass = staleClassification(job, now)
    const lockActive = Boolean(job.lockSession && job.lockExpiresAt && Date.parse(job.lockExpiresAt) > Date.now())
    const riskMeta = { duplicateCandidate, staleClass, lockActive, lockOwner: job.lockOwner }
    const disposition = executionDisposition(job, recoveryMeta, dependencyMeta, riskMeta)
    const routing = preferredExecutor(job, { claudeValidated })
    const tokenCost = classifyTokenCost(job)
    const riskLevel = classifyRisk(job)
    const hours = ageHours(job, now)
    const starvationRisk = starvationRiskLevel(hours)
    const urgency = urgencyFor(job, hours)
    const confidence = confidenceFor(job, routing)
    const recoveryLikelihood = recoveryLikelihoodFor(job, recoveryMeta)
    const dependencyReadiness = dependencyMeta?.dependencyStatus || 'ready'
    const localModelAllowed = Boolean(routing.selectedExecutor === 'local_ai' && riskLevel === 'low')
    let score = baseScoreForStatus(job)
    if (disposition.executable) score += 10
    if (tokenCost === 'low') score += 6
    if (riskLevel === 'high') score -= 8
    if (localAIDraftEligible(job)) score += 4
    if (starvationRisk === 'high') score += 12
    if (starvationRisk === 'medium') score += 6
    if (urgency === 'critical') score += 15
    if (!disposition.executable) score -= 25
    if (recoveryMeta?.recoveryClassification === 'safe_to_resume') score += 8
    if (recoveryReport?.reconciliationRequired) score -= 3
    if (duplicateCandidate) score -= 20
    if (dependencyReadiness === 'orphan_dependency') score -= 15

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
      riskScore: riskLevel === 'high' ? 90 : riskLevel === 'medium' ? 60 : 25,
      tokenCost,
      executorSuitability: routing.selectedExecutor,
      urgency,
      confidence,
      recoveryLikelihood,
      dependencyReadiness,
      duplicateRisk: duplicateCount > 1 ? 'high' : 'low',
      starvationRisk,
      localModelAllowed,
      requiredReviewChain: buildReviewChain(job),
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
      localAIOutputLabel: routing.selectedExecutor === 'local_ai' ? 'local_ai_draft' : null,
      hallucinationRisk: routing.selectedExecutor === 'local_ai' ? 'requires_review' : null,
      preferredExecutor: routing.preferredExecutor,
      selectedExecutor: routing.selectedExecutor,
      executorPolicy: routing.executorPolicy,
      selectedBecause: routing.selectedBecause,
      localAIFinalAllowed: routing.localAIFinalAllowed,
      overnightRecommended,
      canonicalFingerprint: fingerprint,
      canonicalJobId,
      duplicateCandidate,
      staleClassification: staleClass,
      reviewChain: buildReviewChain(job),
    }
  }).sort((a, b) => b.priorityScore - a.priorityScore || String(b.lastUpdated).localeCompare(String(a.lastUpdated)))

  const debt = buildReconciliationDebtView({ recoveryReport, queuePriorities: { priorities }, now })
  priorities = priorities.map((item, index) => ({
    ...item,
    reconciliationDebtScore: debt.reconciliationDebtScore,
    whyRecommended: item.executable
      ? `Recommended because ${item.selectedExecutor} suits the work, urgency=${item.urgency}, starvationRisk=${item.starvationRisk}, dependencyReadiness=${item.dependencyReadiness}.`
      : `Blocked because ${item.blockedReason}; recommended action: ${item.recommendedAction}`,
    queueRank: index + 1,
  }))

  return {
    generatedAt: now,
    reconciliationRequired: Boolean(recoveryReport?.reconciliationRequired),
    reconciliationDebtScore: debt.reconciliationDebtScore,
    dailyRollupPolicy: buildDailyRollupPolicy(),
    counts: {
      total: priorities.length,
      executable: priorities.filter((item) => item.executable).length,
      blocked: priorities.filter((item) => !item.executable).length,
      localAIDraftEligible: priorities.filter((item) => item.localAIDraftEligible).length,
      overnightRecommended: priorities.filter((item) => item.overnightRecommended).length,
      gptCodexRequired: priorities.filter((item) => item.selectedExecutor === 'gpt_codex').length,
      claudeEligible: priorities.filter((item) => item.preferredExecutor === 'claude_cli').length,
      localAIEligible: priorities.filter((item) => item.selectedExecutor === 'local_ai').length,
      manualOnly: priorities.filter((item) => item.blockedReason === 'manual_only').length,
      dependencyBlocked: priorities.filter((item) => item.blockedReason === 'dependency_blocked' || item.blockedReason === 'orphan_dependency').length,
      staleRecovery: priorities.filter((item) => item.staleClassification).length,
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
      whyRecommended: item.whyRecommended,
      blockedReason: item.blockedReason || null,
      executable: item.executable,
      reviewChain: clone(item.reviewChain),
    }))

  if (!executable.length && (priorities[0]?.reconciliationDebtScore || 0) > 0) {
    top.unshift({
      rank: 0,
      jobId: 'system_reconciliation_debt',
      title: 'Resolve reconciliation debt before promoting more execution',
      owner: 'Nettie',
      departmentHead: 'Nettie',
      selectedExecutor: 'local_ai',
      priorityScore: 999,
      tokenCost: 'low',
      overnightRecommended: false,
      recommendedAction: 'Review /api/recovery/debt and clear top reconciliation blockers.',
      whyRecommended: 'Reconciliation debt is blocking safe execution promotion.',
      blockedReason: 'reconciliation_debt',
      executable: false,
      reviewChain: [{ stage: 'nettie_final_assembly', owner: 'Nettie', required: true }],
    })
    for (let i = 0; i < top.length; i += 1) top[i].rank = i + 1
  }

  return {
    generatedAt: new Date().toISOString(),
    count: top.slice(0, limit).length,
    mode: executable.length ? 'executable' : 'blocked_resolution',
    nextActions: top.slice(0, limit),
  }
}
