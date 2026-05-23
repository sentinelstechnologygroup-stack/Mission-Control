import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { detectNettieIntent } from './nettieIntent.js'
import { buildNettieCommandResponse } from './nettieResponseEngine.js'
import { getRuntimeContinuityPaths } from './runtimeContinuity.js'

function nowIso(deps = {}) {
  return typeof deps.nowIso === 'function' ? deps.nowIso() : new Date().toISOString()
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function appendJsonLine(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`)
}

function cleanMessage(value = '') {
  return String(value || '').trim()
}

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeOwner(value = '') {
  const raw = String(value || '').trim()
  const lower = raw.toLowerCase()
  const aliases = {
    van: 'Van',
    perry: 'Perry',
    torina: 'Torina',
    dana: 'Dana',
    icky: 'Icky',
    ivy: 'Funboy',
    funboy: 'Funboy',
    rab: 'Rab',
    nettie: 'Nettie',
  }
  return aliases[lower] || raw || 'Van'
}

function departmentForOwner(owner = '') {
  const normalized = normalizeOwner(owner)
  const mapping = {
    Van: { label: 'Technology', slug: 'technology' },
    Perry: { label: 'Security', slug: 'security' },
    Torina: { label: 'Media', slug: 'media' },
    Dana: { label: 'Finance', slug: 'finance' },
    Icky: { label: 'Admin', slug: 'admin' },
    Funboy: { label: 'Opportunity', slug: 'opportunity' },
    Rab: { label: 'Research', slug: 'research' },
    Nettie: { label: 'Command', slug: 'command' },
  }
  return mapping[normalized] || { label: normalized || 'Unassigned', slug: slugify(normalized || 'unassigned') }
}

function routeAgentFromMessage(message = '', deps = {}) {
  if (typeof deps.extractAgent === 'function') {
    return normalizeOwner(deps.extractAgent(message) || 'Van')
  }
  const detected = detectNettieIntent(message)
  return normalizeOwner(detected.owner || 'Van')
}

function routeTaskFromMessage(message = '', deps = {}) {
  if (typeof deps.extractTask === 'function') {
    return cleanMessage(deps.extractTask(message))
  }
  return cleanMessage(message)
}

function sourceLabel(deps = {}, fallback = 'mission-control') {
  return typeof deps.sourceLabel === 'string' && deps.sourceLabel.trim() ? deps.sourceLabel.trim() : fallback
}

function buildRuntimeSnapshot(deps = {}) {
  const registry = typeof deps.buildMasterWorkRegistry === 'function' ? deps.buildMasterWorkRegistry() : null
  const executorStatus = typeof deps.buildExecutorBridgeStatus === 'function' ? deps.buildExecutorBridgeStatus() : null
  const reconciliation = typeof deps.buildRuntimeReconciliationView === 'function' ? deps.buildRuntimeReconciliationView() : null
  const health = typeof deps.buildRuntimeHealthView === 'function' ? deps.buildRuntimeHealthView() : null
  return { registry, executorStatus, reconciliation, health }
}

function buildBlockerSummary({ executorStatus = null, registry = null, reconciliation = null }) {
  const blockers = []
  if (executorStatus && executorStatus.available === false) {
    blockers.push(executorStatus.reason || 'Native executor unavailable')
  }
  const blockedJobs = Array.isArray(registry?.blocked) ? registry.blocked : []
  if (blockedJobs.length) {
    const top = blockedJobs[0]
    blockers.push(`${top.id || top.jobId}: ${top.task || top.title || 'blocked work'} → ${top.blockerClass || top.routeStatus || top.status || 'blocked'}`)
  }
  const reconClass = reconciliation?.overallStatus || reconciliation?.truthStatus || reconciliation?.status || null
  if (reconClass && !String(reconClass).toLowerCase().includes('ok') && !String(reconClass).toLowerCase().includes('live')) {
    blockers.push(`Runtime reconciliation: ${reconClass}`)
  }
  return blockers.filter(Boolean).join(' | ') || 'No blocker reported.'
}

function summarizeSources(snapshot) {
  return {
    registry: snapshot.registry ? {
      active: Array.isArray(snapshot.registry.active) ? snapshot.registry.active.length : 0,
      queued: Array.isArray(snapshot.registry.queued) ? snapshot.registry.queued.length : 0,
      running: Array.isArray(snapshot.registry.running) ? snapshot.registry.running.length : 0,
      blocked: Array.isArray(snapshot.registry.blocked) ? snapshot.registry.blocked.length : 0,
    } : null,
    executorStatus: snapshot.executorStatus || null,
    reconciliation: snapshot.reconciliation || null,
    health: snapshot.health || null,
  }
}

function buildRoutingArtifact({
  message,
  threadId,
  actor,
  selectedMode,
  context = {},
  deps = {},
  detectedIntent = null,
  now = null,
}) {
  const timestamp = now || nowIso(deps)
  const runtimeDir = deps.runtimeDir || path.join(process.cwd(), 'runtime')
  const paths = getRuntimeContinuityPaths(runtimeDir)
  const snapshot = buildRuntimeSnapshot(deps)
  const executorStatus = snapshot.executorStatus || { available: false, reason: 'Executor bridge status unavailable.' }
  const nativeExecutorAvailable = Boolean(executorStatus?.available)
  const explicitHermes = /hermes/i.test(String(selectedMode || ''))
  const selectedExecutor = explicitHermes
    ? 'hermes'
    : nativeExecutorAvailable
      ? (typeof deps.selectExecutor === 'function' ? deps.selectExecutor() : 'native')
      : null
  const hermesUsed = explicitHermes && !nativeExecutorAvailable
  const fallbackReason = explicitHermes
    ? 'Hermes explicitly selected.'
    : nativeExecutorAvailable
      ? null
      : (executorStatus?.reason || 'Native executor unavailable.')
  const owner = normalizeOwner(context.owner || detectedIntent?.owner || routeAgentFromMessage(message, deps) || 'Van')
  const departmentInfo = departmentForOwner(owner)
  const task = cleanMessage(context.task || routeTaskFromMessage(message, deps) || message)
  const executionMode = hermesUsed
    ? 'HERMES_FALLBACK'
    : nativeExecutorAvailable
      ? 'MC_NATIVE'
      : 'BLOCKED_NO_EXECUTOR'
  const lifecycleState = nativeExecutorAvailable || hermesUsed ? 'queued' : 'blocked'
  const eventId = `evt_${crypto.randomUUID().slice(0, 8)}`
  const executionId = `wf_${crypto.randomUUID().slice(0, 8)}`
  const packetId = `job_${crypto.randomUUID().slice(0, 8)}`
  const workflowLink = `/departments/${departmentInfo.slug}/agents/${slugify(owner)}`
  const departmentLink = `/departments/${departmentInfo.slug}`
  const blocker = buildBlockerSummary(snapshot)
  const evidence = {
    message,
    threadId,
    actor,
    selectedMode,
    runtime: summarizeSources(snapshot),
  }
  const workflowExecution = {
    executionId,
    packetId,
    jobId: packetId,
    department: departmentInfo.label,
    departmentSlug: departmentInfo.slug,
    owner,
    agent: owner,
    status: lifecycleState,
    routeStatus: lifecycleState,
    executionMode,
    currentStep: lifecycleState === 'queued' ? 'queue' : 'blocker',
    blockers: blocker ? [blocker] : [],
    eventId,
    evidence,
    logs: [
      {
        at: timestamp,
        level: lifecycleState === 'queued' ? 'info' : 'warn',
        step: lifecycleState === 'queued' ? 'queue' : 'blocker',
        message: lifecycleState === 'queued'
          ? `Packet queued for ${owner}.`
          : `Routing blocked for ${owner}.`,
        data: { eventId, executionId, executionMode, selectedExecutor },
      },
    ],
    history: [
      {
        at: timestamp,
        type: 'materialize',
        status: lifecycleState,
        message: `Materialized route for ${owner}`,
        data: { eventId, executionId, blocker },
      },
    ],
    nextAction: lifecycleState === 'queued'
      ? `Monitor ${owner} queue and execution state.`
      : 'Repair native execution availability and retry routing.',
    workflow: typeof deps.buildDepartmentWorkflow === 'function'
      ? deps.buildDepartmentWorkflow(owner, task, typeof deps.buildReviewChain === 'function'
        ? deps.buildReviewChain({ owner, task, description: message })
        : [])
      : null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    source: sourceLabel(deps, 'mission-control'),
    sourceType: 'mission-control',
  }

  const jobInput = {
    id: packetId,
    jobId: packetId,
    agent: owner,
    owner,
    department: departmentInfo.label,
    departmentSlug: departmentInfo.slug,
    task,
    title: task,
    description: message,
    status: lifecycleState,
    routeStatus: lifecycleState,
    executionMode,
    sourceType: 'mission-control',
    source: sourceLabel(deps, 'mission-control'),
    sourceRef: `nettie:${owner}:${eventId}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    heartbeatAt: timestamp,
    priority: 'P1',
    phase: lifecycleState === 'queued' ? 'SCOPED' : 'BLOCKED',
    stage: lifecycleState === 'queued' ? 'SCOPED' : 'BLOCKED',
    inputPayload: {
      task,
      text: message,
      threadId,
      actor,
      selectedMode,
      assignedDepartmentHead: owner,
      requestedExecutor: selectedExecutor,
      executionMode,
      lifecycleState,
      blocker,
      nativeExecutorAvailable,
    },
    outputPayload: null,
    context: {
      ...context,
      threadId,
      actor,
      routedBy: 'Nettie',
      intent: detectedIntent?.intent || (explicitHermes ? 'hermes_fallback' : 'route_to_agent'),
      selectedMode,
    },
    workflowExecution,
    executionTrace: [
      {
        at: timestamp,
        type: 'route_materialized',
        status: lifecycleState,
        message: blocker ? `Blocked: ${blocker}` : `Queued for ${owner}`,
        data: { eventId, executionId, executionMode, selectedExecutor },
      },
    ],
    history: [
      {
        at: timestamp,
        type: 'materialize',
        status: lifecycleState,
        message: `Materialized route for ${owner}`,
        data: { eventId, executionId, blocker },
      },
    ],
    nextAction: workflowExecution.nextAction,
    blocker,
    blockers: blocker ? [blocker] : [],
    evidence,
    executorUsed: selectedExecutor || 'none',
    hermesUsed,
    fallbackReason,
    nativeExecutorAvailable,
    selectedExecutor,
    eventId,
    packetEventId: eventId,
  }

  const created = deps.jobStore && typeof deps.jobStore.createJob === 'function'
    ? deps.jobStore.createJob(jobInput)
    : { job: { ...jobInput }, deduped: false }

  const job = created?.job || created
  const createdJob = {
    ...job,
    workflowExecution: {
      ...(job.workflowExecution || workflowExecution),
      packetId: job.id || job.jobId || packetId,
      jobId: job.id || job.jobId || packetId,
      executionId: job.workflowExecution?.executionId || workflowExecution.executionId,
      eventId: job.workflowExecution?.eventId || workflowExecution.eventId,
      department: job.workflowExecution?.department || departmentInfo.label,
      owner: job.workflowExecution?.owner || owner,
      agent: job.workflowExecution?.agent || owner,
    },
    eventId: job.eventId || eventId,
    packetEventId: job.packetEventId || eventId,
  }

  const finalEvent = {
    eventId,
    timestamp,
    type: 'nettie.packet.materialized',
    packetId: createdJob.id || createdJob.jobId || packetId,
    executionId: createdJob.workflowExecution?.executionId || executionId,
    owner,
    agent: owner,
    department: departmentInfo.label,
    departmentSlug: departmentInfo.slug,
    status: lifecycleState,
    blocker,
    evidence,
    executorUsed: createdJob.executorUsed || selectedExecutor || 'none',
    hermesUsed,
    fallbackReason,
    nativeExecutorAvailable,
    selectedExecutor: createdJob.selectedExecutor || selectedExecutor || null,
    source: sourceLabel(deps, 'mission-control'),
    threadId,
    actor,
    message,
  }

  appendJsonLine(paths.events, finalEvent)

  const assistantReply = lifecycleState === 'queued'
    ? `Routed to ${owner} in ${departmentInfo.label}. Packet ${createdJob.id || createdJob.jobId || packetId} is queued for the live agent registry inspection.`
    : `Routed to ${owner} in ${departmentInfo.label}. Packet ${createdJob.id || createdJob.jobId || packetId} is materialized, but autonomous execution is blocked. ${blocker}`

  return {
    job: createdJob,
    replyText: assistantReply,
    assistantReply,
    eventId,
    executionId: createdJob.workflowExecution?.executionId || executionId,
    packetId: createdJob.id || createdJob.jobId || packetId,
    lifecycleState,
    executionMode,
    blocker,
    department: departmentInfo.label,
    departmentLink,
    workflowLink,
    hermesUsed,
    fallbackReason,
    nativeExecutorAvailable,
    selectedExecutor: createdJob.selectedExecutor || selectedExecutor || null,
    evidence,
    workflowExecution: createdJob.workflowExecution,
  }
}

function wrapAssistantContract(response = {}) {
  const assistantReply = response.assistantReply || response.replyMarkdown || response.summary || ''
  const createdJobs = Array.isArray(response.createdJobs) ? response.createdJobs : []
  const primaryJob = createdJobs[0] || response.createdJob || response.job || null
  const packetId = response.packetId || response.jobId || primaryJob?.jobId || primaryJob?.id || null
  const assignedDepartmentHead = response.assignedDepartmentHead || primaryJob?.owner || primaryJob?.agent || response.context?.assignedDepartmentHead || null
  const assignedAgent = response.assignedAgent || primaryJob?.agent || primaryJob?.owner || response.context?.assignedAgent || null
  const department = response.department || primaryJob?.department || departmentForOwner(assignedDepartmentHead).label
  const departmentSlug = response.departmentSlug || primaryJob?.departmentSlug || slugify(department)
  const agentSlug = slugify(assignedAgent || assignedDepartmentHead || 'nettie')
  const workflowLink = response.workflowLink || (department ? `/departments/${departmentSlug}/agents/${agentSlug}` : null)
  const departmentLink = response.departmentLink || (department ? `/departments/${departmentSlug}` : null)
  const executionId = response.executionId || primaryJob?.workflowExecution?.executionId || null
  const eventId = response.eventId || primaryJob?.workflowExecution?.eventId || primaryJob?.eventId || null
  const lifecycleState = response.lifecycleState || primaryJob?.status || primaryJob?.workflowExecution?.status || (createdJobs.length ? 'queued' : 'assistant-first')
  const executionMode = response.executionMode || primaryJob?.executionMode || primaryJob?.workflowExecution?.executionMode || (createdJobs.length ? 'MC_NATIVE' : 'assistant-first')
  const routingDecision = response.routingDecision || response.intent || null
  const statusSummary = response.statusSummary || response.summary || assistantReply || ''
  const conversationMode = response.conversationMode || (response.needsClarification ? 'clarify' : createdJobs.length ? 'routed' : 'assistant-first')
  const threadId = response.threadId || response.id || packetId || crypto.randomUUID()
  const messages = Array.isArray(response.messages) && response.messages.length
    ? response.messages
    : [{ id: response.reply?.id || threadId, role: 'assistant', from: 'Nettie', text: assistantReply, kind: response.reply?.kind || 'system', ts: response.reply?.ts || response.createdAt || nowIso(), jobId: packetId, threadId }]

  return {
    ...response,
    assistantReply,
    conversationMode,
    threadId,
    messages,
    routingDecision,
    createdJobs,
    executionMode,
    packetId,
    executionId,
    eventId,
    workflowLink,
    departmentLink,
    department,
    status: response.status || lifecycleState,
    lifecycleState,
    statusSummary,
    suggestedNextSteps: Array.isArray(response.suggestedNextSteps)
      ? response.suggestedNextSteps
      : Array.isArray(response.recommendedActions)
        ? response.recommendedActions
        : [],
    assignedDepartmentHead,
    assignedAgent,
    hermesUsed: Boolean(response.hermesUsed),
    fallbackReason: response.fallbackReason || null,
    nativeExecutorAvailable: response.nativeExecutorAvailable ?? null,
    selectedExecutor: response.selectedExecutor || primaryJob?.selectedExecutor || null,
  }
}

export async function materializeNettieIntent({
  message,
  threadId,
  actor = 'Patrick',
  selectedMode = 'auto',
  context = {},
  deps = {},
  now = null,
} = {}) {
  const text = cleanMessage(message)
  const timestamp = now || nowIso(deps)
  const detected = detectNettieIntent(text)
  const materializedThreadId = threadId || context.threadId || `nettie:${actor}:${timestamp.replace(/[:.]/g, '-')}`

  if (typeof deps.addChatMessage === 'function') {
    deps.addChatMessage({
      id: crypto.randomUUID(),
      from: actor,
      role: 'Operator',
      kind: 'command',
      channel: context.channel || 'mission-control-ui',
      text,
      ts: timestamp,
      threadId: materializedThreadId,
      jobId: context.jobId || null,
    })
  }

  const response = await buildNettieCommandResponse({
    message: text,
    operator: actor,
    context: { ...context, threadId: materializedThreadId, actor, selectedMode },
    now: timestamp,
    sources: {
      queueSummary: typeof deps.buildQueueSummaryView === 'function' ? async () => deps.buildQueueSummaryView() : undefined,
      jobsBlocked: typeof deps.buildBlockedJobsClassifiedView === 'function' ? async () => deps.buildBlockedJobsClassifiedView() : undefined,
      jobsStale: typeof deps.buildQueueSummaryView === 'function' ? async () => deps.buildQueueSummaryView().staleJobs : undefined,
      reportsStatus: typeof deps.buildReportsStatusView === 'function' ? async () => deps.buildReportsStatusView() : undefined,
      runtimeHealth: typeof deps.buildRuntimeHealthView === 'function' ? async () => deps.buildRuntimeHealthView() : undefined,
      runtimeReconciliation: typeof deps.buildRuntimeReconciliationView === 'function' ? async () => deps.buildRuntimeReconciliationView() : undefined,
      runtimeLocks: typeof deps.buildRuntimeLocksView === 'function' ? async () => deps.buildRuntimeLocksView() : undefined,
      triageSummary: typeof deps.buildTriageSummaryView === 'function' ? async () => deps.buildTriageSummaryView() : undefined,
      workRegistry: typeof deps.buildMasterWorkRegistry === 'function' ? async () => deps.buildMasterWorkRegistry() : undefined,
    },
    actions: {
      routeAssignment: async (assignmentMessage) => buildRoutingArtifact({
        message: assignmentMessage,
        threadId: materializedThreadId,
        actor,
        selectedMode,
        context: {
          ...context,
          threadId: materializedThreadId,
          owner: detected.owner || context.owner || routeAgentFromMessage(assignmentMessage, deps) || 'Van',
          task: routeTaskFromMessage(assignmentMessage, deps),
        },
        deps,
        detectedIntent: detected,
        now: timestamp,
      }),
    },
  })

  const routedJob = response.createdJobs?.[0] || response.createdJob || response.job || null
  if (routedJob) {
    const execution = routedJob.workflowExecution || {}
    response.createdJobs = response.createdJobs?.length ? response.createdJobs : [routedJob]
    response.createdJob = routedJob
    response.job = routedJob
    response.packetId = response.packetId || routedJob.id || routedJob.jobId || execution.packetId || null
    response.executionId = response.executionId || execution.executionId || null
    response.eventId = response.eventId || execution.eventId || routedJob.eventId || null
    response.lifecycleState = response.lifecycleState || routedJob.status || execution.status || 'queued'
    response.status = response.status || response.lifecycleState
    response.executionMode = routedJob.executionMode || execution.executionMode || response.executionMode || 'MC_NATIVE'
    response.blocker = response.blocker || routedJob.blocker || execution.blockers?.[0] || null
    response.department = response.department || routedJob.department || execution.department || departmentForOwner(routedJob.owner || routedJob.agent || detected.owner || 'Van').label
    response.departmentSlug = response.departmentSlug || routedJob.departmentSlug || slugify(response.department)
    response.departmentLink = response.departmentLink || `/departments/${response.departmentSlug}`
    response.workflowLink = response.workflowLink || `/departments/${response.departmentSlug}/agents/${slugify(routedJob.agent || routedJob.owner || detected.owner || 'Van')}`
    response.hermesUsed = Boolean(routedJob.hermesUsed || execution.executionMode === 'HERMES_FALLBACK')
    response.fallbackReason = routedJob.fallbackReason || response.fallbackReason || null
    response.nativeExecutorAvailable = routedJob.nativeExecutorAvailable ?? response.nativeExecutorAvailable ?? null
    response.selectedExecutor = routedJob.selectedExecutor || response.selectedExecutor || null
    response.statusSummary = response.statusSummary || routedJob.workflowExecution?.nextAction || response.summary || ''
    response.suggestedNextSteps = Array.isArray(response.suggestedNextSteps) && response.suggestedNextSteps.length
      ? response.suggestedNextSteps
      : [routedJob.workflowExecution?.nextAction || 'Review the packet in the Technology floor.']
    response.events = Array.isArray(response.events) && response.events.length
      ? response.events
      : [{
          eventId: response.eventId || routedJob.eventId || routedJob.workflowExecution?.eventId || null,
          timestamp,
          type: 'nettie.packet.materialized',
          packetId: response.packetId,
          executionId: response.executionId,
          owner: routedJob.owner || routedJob.agent || detected.owner || 'Van',
          department: response.department,
          status: response.lifecycleState,
          blocker: response.blocker,
        }]
  }

  const contract = wrapAssistantContract({
    ...response,
    threadId: response.threadId || materializedThreadId,
    conversationMode: response.conversationMode || (routedJob ? 'routed' : 'assistant-first'),
  })

  if (typeof deps.addChatMessage === 'function') {
    deps.addChatMessage({
      id: crypto.randomUUID(),
      from: 'Nettie',
      role: 'Executive Assistant',
      kind: contract.conversationMode === 'clarify' ? 'clarify' : routedJob ? 'packet' : 'assistant',
      channel: context.channel || 'mission-control-ui',
      text: contract.assistantReply,
      ts: timestamp,
      jobId: contract.packetId || null,
      packetId: contract.packetId || null,
      threadId: contract.threadId,
      department: contract.department,
      agent: contract.assignedAgent,
      eventId: contract.eventId || null,
    })
  }

  return contract
}

export { materializeNettieIntent as materializeOrchestrationIntent }
