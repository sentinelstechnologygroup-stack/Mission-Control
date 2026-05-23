import { detectNettieIntent } from './nettieIntent.js'

function formatSection(title, lines = []) {
  const body = (lines || []).filter(Boolean).map((line) => line.startsWith('-') ? line : `- ${line}`)
  return `${title}:\n${body.length ? body.join('\n') : '- None'}`
}

function makeConfidence({ truthStatus = 'LIVE', queriedSources = [], createdJobs = [], requiresApproval = false }) {
  let score = truthStatus === 'LIVE' ? 88 : truthStatus === 'DEGRADED' ? 64 : 45
  score += Math.min(queriedSources.length * 2, 8)
  if (createdJobs.length) score += 2
  if (requiresApproval) score -= 4
  score = Math.max(0, Math.min(100, score))
  return { score, label: score >= 85 ? 'HIGH' : score >= 65 ? 'MEDIUM' : 'LOW' }
}

function summarizeCreatedJobs(createdJobs = []) {
  return (createdJobs || []).map((job) => `${job.jobId || job.id}: ${job.task || job.title} — ${job.status || 'queued'} → ${job.owner || job.agent || job.department || 'Unassigned'}`)
}

function summarizeBlocked(blocked = [], max = 3) {
  return (blocked || []).slice(0, max).map((job) => `${job.jobId || job.id} — ${job.task || job.title} — ${job.blockerClass || job.blockedReason || job.routeStatus || job.status} — ${job.owner || job.agent || 'Unknown'}`)
}

function summarizeQueue(queue = {}) {
  return [
    `Queued ${queue.totalQueued ?? 0}`,
    `Running ${queue.totalRunning ?? 0}`,
    `Blocked ${queue.totalBlocked ?? 0}`,
    `Stale ${queue.staleJobs?.length ?? 0}`,
  ]
}

function approvalGate(intent, message = '') {
  const lower = String(message || '').toLowerCase()
  if (intent === 'deployment_request') return { requiresApproval: true, reason: 'Production deployment requires Patrick approval.' }
  if (/credential|secret|billing|legal|client-facing|public publish|destructive cleanup/.test(lower)) {
    return { requiresApproval: true, reason: 'Requested action requires Patrick approval.' }
  }
  return { requiresApproval: false, reason: null }
}

export async function buildNettieCommandResponse({
  message,
  operator = 'Patrick',
  context = {},
  sources = {},
  actions = {},
  now = new Date().toISOString(),
} = {}) {
  const text = String(message || '').trim()
  const detected = detectNettieIntent(text)
  const gate = approvalGate(detected.intent, text)
  const queriedSources = []
  const createdJobs = []
  const recommendedActions = []
  let truthStatus = 'LIVE'
  let summary = ''
  let replyMarkdown = ''

  const query = async (name, fn) => {
    if (typeof fn !== 'function') return null
    const data = await fn()
    queriedSources.push(name)
    if (data?.truthStatus && data.truthStatus !== 'LIVE') truthStatus = 'DEGRADED'
    return data
  }

  if (gate.requiresApproval) {
    summary = gate.reason
    replyMarkdown = [
      formatSection('STATUS', ['Approval hold engaged.', `Interpreted intent: ${detected.intent}`]),
      formatSection('QA', ['No mutating action executed.', 'Request held at approval gate.']),
      formatSection('RISKS / NOTES', [gate.reason]),
      formatSection('NEXT', ['Route to Patrick approval queue before execution.']),
    ].join('\n\n')
  } else if (detected.intent === 'status') {
    const queue = await query('/api/queues/summary', sources.queueSummary)
    const blocked = await query('/api/jobs/blocked', sources.jobsBlocked)
    const reconciliation = await query('/api/runtime/reconciliation', sources.runtimeReconciliation)
    summary = `Status ready: ${queue?.totalRunning ?? 0} running, ${queue?.totalQueued ?? 0} queued, ${queue?.totalBlocked ?? 0} blocked.`
    recommendedActions.push(...(reconciliation?.recommendedActions || []).slice(0, 3))
    replyMarkdown = [
      formatSection('STATUS', [...summarizeQueue(queue), `Truth ${reconciliation?.truthStatus || truthStatus}`]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', summarizeBlocked(blocked, 3).length ? summarizeBlocked(blocked, 3) : ['No top blockers returned.']),
      formatSection('NEXT', recommendedActions.length ? recommendedActions : ['Review runtime reconciliation before adding more work.']),
    ].join('\n\n')
  } else if (detected.intent === 'queue_status') {
    const queue = await query('/api/queues/summary', sources.queueSummary)
    const registry = await query('/api/work/registry', sources.workRegistry)
    summary = `Queue ready: ${queue?.totalQueued ?? 0} queued, ${queue?.totalRunning ?? 0} running.`
    replyMarkdown = [
      formatSection('STATUS', [...summarizeQueue(queue), `Registry active bucket ${registry?.active?.length ?? 0}`]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', [(queue?.staleJobs?.length ?? 0) ? `${queue.staleJobs.length} stale jobs remain in queue view.` : 'No stale jobs detected in queue view.']),
      formatSection('NEXT', ['Use Operational Triage for blocker and mismatch analysis.']),
    ].join('\n\n')
  } else if (detected.intent === 'blocked_jobs') {
    const blocked = await query('/api/jobs/blocked', sources.jobsBlocked)
    const reconciliation = await query('/api/runtime/reconciliation', sources.runtimeReconciliation)
    summary = `Blocked summary ready: ${(blocked || []).length} blocked jobs classified.`
    recommendedActions.push(...(reconciliation?.recommendedActions || []).slice(0, 3))
    replyMarkdown = [
      formatSection('STATUS', [`Blocked ${(blocked || []).length}`, ...(reconciliation?.blockerBreakdown || []).slice(0, 5).map((group) => `${group.blockerClass}: ${group.count}`)]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', summarizeBlocked(blocked, 5)),
      formatSection('NEXT', recommendedActions.length ? recommendedActions : ['Clear top blocker class before adding new work.']),
    ].join('\n\n')
  } else if (detected.intent === 'stale_jobs') {
    const reconciliation = await query('/api/runtime/reconciliation', sources.runtimeReconciliation)
    summary = `Stale debt ready: ${(reconciliation?.staleJobs || []).length} stale jobs.`
    replyMarkdown = [
      formatSection('STATUS', [`Stale jobs ${(reconciliation?.staleJobs || []).length}`, `Stale reports ${reconciliation?.mismatches?.find((m) => m.type === 'stale_reports_present')?.staleReports || 0}`]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', (reconciliation?.staleJobs || []).slice(0, 5).map((job) => `${job.jobId} — ${job.task} — ${job.ageHours}h stale`)),
      formatSection('NEXT', reconciliation?.safeAutoFixesAvailable?.length ? reconciliation.safeAutoFixesAvailable : ['Prepare a reconciliation plan before cleanup.']),
    ].join('\n\n')
  } else if (detected.intent === 'report_status') {
    const reports = await query('/api/reports/status', sources.reportsStatus)
    summary = `Report status ready: ${reports?.staleCount ?? 0} stale reports.`
    replyMarkdown = [
      formatSection('STATUS', [`Reports tracked ${reports?.total ?? 0}`, `Stale ${reports?.staleCount ?? 0}`]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', (reports?.stale || []).slice(0, 5).map((report) => `${report.id || report.title} — ${report.title} — ${report.truthStatus}`)),
      formatSection('NEXT', [(reports?.staleCount ?? 0) ? 'Refresh stale reports before relying on them operationally.' : 'No report refresh required.']),
    ].join('\n\n')
  } else if (detected.intent === 'runtime_health') {
    const health = await query('/api/runtime/health', sources.runtimeHealth)
    const locks = await query('/api/runtime/locks', sources.runtimeLocks)
    summary = `Runtime health ready: ${health?.overallHealth || 'UNKNOWN'}.`
    replyMarkdown = [
      formatSection('STATUS', [`Health ${health?.overallHealth || 'UNKNOWN'}`, `Queue ${health?.queueStatus || 'UNKNOWN'}`, `Reports ${health?.reportStatus || 'UNKNOWN'}`, `Executor ${health?.executorTruth || 'UNKNOWN'}`]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', [`Lock conflicts ${(locks?.lockConflicts || []).length}`, ...(health?.degradedSystems || []).map((item) => `Degraded ${item}`)]),
      formatSection('NEXT', ['Use Operational Triage to reconcile runtime mismatches and lock pressure.']),
    ].join('\n\n')
  } else if (detected.intent === 'triage_summary') {
    const triage = await query('/api/triage/summary', sources.triageSummary)
    summary = `Triage ready: ${triage?.runtimeHealth?.overallHealth || triage?.reconciliation?.overallStatus || 'UNKNOWN'}.`
    replyMarkdown = [
      formatSection('STATUS', [`Truth ${triage?.truthStatus || truthStatus}`, `Runtime ${triage?.runtimeHealth?.overallHealth || 'UNKNOWN'}`, `Queue pressure ${triage?.queuePressure?.queued ?? 0} queued / ${triage?.queuePressure?.blocked ?? 0} blocked`]),
      formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
      formatSection('RISKS / NOTES', (triage?.topRisks || []).slice(0, 5)),
      formatSection('NEXT', (triage?.operatorRecommendations || []).slice(0, 5)),
    ].join('\n\n')
  } else if (detected.intent === 'general_chat') {
    summary = 'General assistant response delivered.'
    replyMarkdown = [
      formatSection('STATUS', ['Nettie online and responding as the Mission Control assistant.', 'No packet was required for this conversational turn.']),
      formatSection('QA', ['No routing or executor action was needed.']),
      formatSection('RISKS / NOTES', ['Conversation remains assistant-first.']),
      formatSection('NEXT', ['Ask for status, routing, a summary, or a department/agent handoff when you want execution.']),
    ].join('\n\n')
  } else if (detected.intent === 'route_to_agent' || detected.intent === 'create_task' || detected.intent === 'security_review' || detected.intent === 'cost_review') {
    if (typeof actions.routeAssignment === 'function') {
      const assignment = await actions.routeAssignment(text)
      if (assignment?.job) {
        createdJobs.push(assignment.job)
      }
      summary = assignment?.replyText || 'Task routed.'
      replyMarkdown = [
        formatSection('STATUS', ['Task intake received.', `Interpreted intent: ${detected.intent}`, `Owner: ${assignment?.job?.owner || detected.owner || 'Unassigned'}`]),
        formatSection('QA', ['Job routing used live Mission Control assignment flow.']),
        formatSection('RISKS / NOTES', [assignment?.replyText || 'No routing note returned.']),
        formatSection('NEXT', summarizeCreatedJobs(createdJobs).length ? summarizeCreatedJobs(createdJobs) : ['Await assignment confirmation in the ledger.']),
      ].join('\n\n')
      queriedSources.push('assignment-router')
    } else {
      summary = 'Task routing unavailable.'
      truthStatus = 'DEGRADED'
      replyMarkdown = [
        formatSection('STATUS', ['Task intake received but routing adapter is unavailable.']),
        formatSection('QA', ['No job was created.']),
        formatSection('RISKS / NOTES', ['Routing adapter missing from current runtime.']),
        formatSection('NEXT', ['Repair assignment routing before retry.']),
      ].join('\n\n')
    }
  } else {
    if (detected.intent === 'clarification_request') {
      summary = 'Clarification required before routing.'
      replyMarkdown = [
        formatSection('STATUS', ['The request is too vague to route safely.', `Interpreted intent: ${detected.intent}`]),
        formatSection('QA', ['No job was created.']),
        formatSection('RISKS / NOTES', ['No packet was created because the target is undefined.']),
        formatSection('NEXT', ['Specify the route, file, API, or packet to fix.']),
      ].join('\n\n')
    } else {
      const triage = await query('/api/triage/summary', sources.triageSummary)
      summary = 'Unknown command handled with fallback triage context.'
      replyMarkdown = [
        formatSection('STATUS', ['Command not recognized with a deterministic intent.', `Fallback triage truth ${triage?.truthStatus || truthStatus}`]),
        formatSection('QA', queriedSources.map((item) => `Queried ${item}`)),
        formatSection('RISKS / NOTES', ['No unsafe action taken.', 'Use status, blocked, queue, triage, or explicit agent-routing phrasing for deterministic handling.']),
        formatSection('NEXT', ['Try: status', 'Try: what is blocked', 'Try: have Van investigate queue drift']),
      ].join('\n\n')
    }
  }

  const confidence = makeConfidence({ truthStatus, queriedSources, createdJobs, requiresApproval: gate.requiresApproval })
  return {
    id: `nettie_${Date.now().toString(36)}`,
    createdAt: now,
    truthStatus,
    intent: detected.intent,
    summary,
    replyMarkdown,
    assistantReply: replyMarkdown,
    conversationMode: detected.intent === 'clarification_request' ? 'clarify' : (createdJobs.length ? 'routed' : 'assistant-first'),
    routingDecision: detected.intent,
    threadId: `nettie:${operator}:${Date.now().toString(36)}`,
    messages: [{ role: 'assistant', from: 'Nettie', text: replyMarkdown, ts: now }],
    queriedSources,
    recommendedActions,
    createdJobs,
    executionMode: createdJobs.length ? 'MC_NATIVE' : 'assistant-first',
    packetId: createdJobs[0]?.jobId || createdJobs[0]?.id || null,
    workflowLink: createdJobs[0] ? `/departments/${String(createdJobs[0].owner || createdJobs[0].agent || 'nettie').toLowerCase()}/agents/${String(createdJobs[0].agent || createdJobs[0].owner || 'nettie').toLowerCase()}` : null,
    departmentLink: createdJobs[0] ? `/departments/${String(createdJobs[0].owner || createdJobs[0].agent || 'nettie').toLowerCase()}` : null,
    statusSummary: summary,
    suggestedNextSteps: recommendedActions,
    requiresApproval: gate.requiresApproval,
    approvalReason: gate.reason,
    confidence,
    operator,
    context,
    command: text,
  }
}
