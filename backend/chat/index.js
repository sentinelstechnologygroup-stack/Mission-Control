import { recordRecursiveGovernanceDecision } from '../../lib/recursiveGovernance.js'
import { buildFailurePacketBlueprint } from '../../lib/failurePacket.js'
import { materializeNettieIntent } from '../../lib/orchestrationMaterializer.js'

export function registerChatRoutes(app, deps) {
  const {
    state,
    fs,
    path,
    runtimeDir,
    crypto,
    nowIso,
    fetch,
    AI_EXECUTION_PROVIDER,
    buildMasterWorkRegistry,
    requireBridgeToken,
    shouldRouteChatToExecutor,
    handleNettieInbound,
    buildExecutorBridgeStatus,
    addChatMessage,
    refreshDerivedState,
    isExplicitHermesRequest,
    selectExecutor,
    queueBridgeMessageForExecutor,
    classifyExecutionIntent,
    sendTelegramText,
    extractTelegramMessage,
    handleAssignment,
    buildNettieCommandResponse,
    jobStore,
    buildDepartmentWorkflow,
    buildReviewChain,
    extractAgent,
    extractTask,
    log,
    telegramWebhookSecret,
  } = deps

  const nettieConversationDir = path.join(runtimeDir, 'nettie-conversations')

  function saveNettieConversation(entry) {
    fs.mkdirSync(nettieConversationDir, { recursive: true })
    const stamp = (entry.createdAt || nowIso()).replace(/[:.]/g, '-')
    const filePath = path.join(nettieConversationDir, `${stamp}-${entry.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2))
    return filePath
  }

  function recordFailurePacket({
    owner,
    category,
    title,
    reason,
    evidence,
    source = 'mission-control-failure-detection',
    sourceRef = null,
    channel = 'mission-control-ui',
    nextAction,
    executionMode = 'BLOCKED_NO_EXECUTOR',
  }) {
    const blueprint = buildFailurePacketBlueprint({
      owner,
      category,
      title,
      reason,
      evidence,
      source,
      sourceRef,
      channel,
      nextAction,
      executionMode,
    })
    const created = jobStore.createJob(blueprint.jobInput)
    const job = created.job || created
    addChatMessage({
      ...blueprint.chatMessage,
      jobId: job.id,
      packetId: job.id,
      text: blueprint.assistantReply.replace(`Packet ID: ${blueprint.packetId}.`, `Packet ID: ${job.id}.`),
    })
    refreshDerivedState()
    return { job, blueprint, deduped: created.deduped }
  }

  function buildAssistantContract(base = {}) {
    const assistantReply = base.assistantReply || base.replyMarkdown || base.reply?.text || base.summary || ''
    const createdJobs = Array.isArray(base.createdJobs) ? base.createdJobs : []
    const primaryJob = createdJobs[0] || base.createdJob || base.job || null
    const packetId = base.packetId || base.jobId || primaryJob?.jobId || primaryJob?.id || null
    const assignedDepartmentHead = base.assignedDepartmentHead || primaryJob?.owner || base.context?.assignedDepartmentHead || null
    const assignedAgent = base.assignedAgent || primaryJob?.agent || primaryJob?.owner || base.context?.assignedAgent || null
    const department = base.department || primaryJob?.department || null
    const departmentSlug = base.departmentSlug || (department ? String(department).toLowerCase().replace(/\s+/g, '-') : null)
    const agentSlug = assignedAgent ? String(assignedAgent).toLowerCase().replace(/\s+/g, '-') : (assignedDepartmentHead ? String(assignedDepartmentHead).toLowerCase().replace(/\s+/g, '-') : null)
    const derivedWorkflowLink = departmentSlug && agentSlug ? `/departments/${departmentSlug}/agents/${agentSlug}` : null
    const derivedDepartmentLink = departmentSlug ? `/departments/${departmentSlug}` : null
    const workflowLink = derivedWorkflowLink || base.workflowLink || null
    const departmentLink = derivedDepartmentLink || base.departmentLink || null
    const executionMode = base.executionMode || primaryJob?.executionMode || primaryJob?.workflowExecution?.executionMode || (createdJobs.length ? 'MC_NATIVE' : 'assistant-first')
    const routingDecision = base.routingDecision || base.intent || null
    const statusSummary = base.statusSummary || base.summary || assistantReply || ''
    const conversationMode = base.conversationMode || (base.needsClarification ? 'clarify' : createdJobs.length ? 'routed' : 'assistant-first')
    const threadId = base.threadId || base.id || packetId || crypto.randomUUID()
    const messages = Array.isArray(base.messages) && base.messages.length
      ? base.messages
      : [{ id: base.reply?.id || threadId, role: 'assistant', from: 'Nettie', text: assistantReply, kind: base.reply?.kind || 'system', ts: base.reply?.ts || base.createdAt || nowIso(), jobId: packetId, threadId }]
    const executionId = base.executionId || primaryJob?.workflowExecution?.executionId || null
    const eventId = base.eventId || primaryJob?.workflowExecution?.eventId || primaryJob?.eventId || null
    const lifecycleState = base.lifecycleState || primaryJob?.status || primaryJob?.workflowExecution?.status || (createdJobs.length ? 'queued' : 'assistant-first')

    return {
      ...base,
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
      lifecycleState,
      status: base.status || lifecycleState,
      statusSummary,
      suggestedNextSteps: Array.isArray(base.suggestedNextSteps)
        ? base.suggestedNextSteps
        : Array.isArray(base.recommendedActions)
          ? base.recommendedActions
          : [],
      assignedDepartmentHead,
      assignedAgent,
      hermesUsed: Boolean(base.hermesUsed),
      fallbackReason: base.fallbackReason || null,
      nativeExecutorAvailable: base.nativeExecutorAvailable ?? null,
      selectedExecutor: base.selectedExecutor || primaryJob?.selectedExecutor || null,
    }
  }

  function loadRecentNettieConversations(limit = 25) {
    try {
      if (!fs.existsSync(nettieConversationDir)) return []
      return fs.readdirSync(nettieConversationDir)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, limit)
        .map((name) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(nettieConversationDir, name), 'utf8'))
          } catch {
            return null
          }
        })
        .filter(Boolean)
    } catch {
      return []
    }
  }

  app.get('/api/chat/history', (_, res) => res.json(state.chat))

  app.get('/api/nettie/conversations/recent', (_, res) => {
    res.json({ conversations: loadRecentNettieConversations() })
  })

  app.post('/api/nettie/command', async (req, res) => {
    const message = String(req.body?.message || '').trim()
    const operator = String(req.body?.operator || 'Patrick').trim() || 'Patrick'
    const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {}

    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    const response = await materializeNettieIntent({
      message,
      threadId: req.body?.threadId || null,
      actor: operator,
      selectedMode: req.body?.selectedMode || 'auto',
      context,
      now: nowIso(),
      deps: {
        ...deps,
        sourceLabel: 'api/nettie/command',
        jobStore,
        buildMasterWorkRegistry: deps.buildMasterWorkRegistry,
        buildExecutorBridgeStatus: deps.buildExecutorBridgeStatus,
        buildDepartmentWorkflow,
        buildReviewChain,
        extractAgent,
        extractTask,
        runtimeDir,
        nowIso,
      },
    })

    const createdJobs = (response.createdJobs || []).map((job) => ({
      jobId: job.jobId || job.id,
      task: job.task || job.title || 'Untitled job',
      owner: job.owner || job.agent || job.department || 'Unknown',
      status: job.status || 'queued',
      routeStatus: job.routeStatus || job.workflowExecution?.routeStatus || job.workflowExecution?.currentStep || null,
      executionMode: job.executionMode || job.workflowExecution?.executionMode || null,
      workflowExecution: job.workflowExecution || null,
      blockers: job.blockers || job.workflowExecution?.blockers || [],
      logs: job.logs || job.workflowExecution?.logs || [],
      evidence: job.evidence || job.workflowExecution?.evidence || null,
    }))
    const primaryJob = createdJobs[0] || null
    const assignedDepartmentHead = response.assignedDepartmentHead || primaryJob?.owner || response.context?.assignedDepartmentHead || response.createdJobs?.[0]?.owner || null
    const assignedAgent = response.assignedAgent || primaryJob?.agent || primaryJob?.owner || response.context?.assignedAgent || response.createdJobs?.[0]?.owner || null
    const department = response.department || primaryJob?.department || null
    const departmentSlug = response.departmentSlug || (department ? department.toLowerCase().replace(/\s+/g, '-') : null)
    const agentSlug = (assignedAgent || assignedDepartmentHead || '').toLowerCase().replace(/\s+/g, '-')
    const executionMode = response.executionMode || (primaryJob ? 'MC_NATIVE' : response.requiresApproval ? 'BLOCKED_NO_EXECUTOR' : null)
    const derivedWorkflowLink = departmentSlug ? `/departments/${departmentSlug}/agents/${agentSlug || departmentSlug}` : null
    const derivedDepartmentLink = departmentSlug ? `/departments/${departmentSlug}` : null
    const workflowLink = derivedWorkflowLink || response.workflowLink || null
    const departmentLink = derivedDepartmentLink || response.departmentLink || null
    const jobId = primaryJob?.jobId || primaryJob?.id || response.createdJobs?.[0]?.jobId || response.createdJobs?.[0]?.id || response.packetId || null
    const enhanced = buildAssistantContract({
      ...response,
      jobId,
      packetId: jobId,
      packetLink: departmentLink,
      workflowRecordLink: workflowLink,
      createdJobs,
      approvalRequired: response.requiresApproval,
      executionMode,
      assignedDepartmentHead,
      assignedAgent,
      department,
      departmentSlug,
      workflowLink,
      departmentLink,
    })
    saveNettieConversation(enhanced)
    recordRecursiveGovernanceDecision(runtimeDir, {
      source: 'api/nettie/command',
      operator,
      workflowId: response.executionId || response.id || null,
      jobId: response.createdJobs?.[0]?.jobId || response.createdJobs?.[0]?.id || null,
      department: response.department || response.assignedDepartmentHead || response.createdJobs?.[0]?.department || 'Nettie',
      status: response.lifecycleState === 'blocked' ? 'blocked' : response.createdJobs?.length ? 'accepted' : 'incomplete',
      decision: response.lifecycleState === 'blocked' ? 'blocked' : response.createdJobs?.length ? 'accepted' : 'incomplete',
      correctionDirectives: response.lifecycleState === 'blocked' && response.blocker ? [response.blocker] : response.requiresApproval && response.approvalReason ? [response.approvalReason] : [],
      nextPhaseDirectives: response.recommendedActions || [],
      evidence: {
        queriedSources: response.queriedSources || [],
        createdJobs: response.createdJobs || [],
        confidence: response.confidence || null,
      },
      replyMarkdown: response.replyMarkdown || null,
      summary: response.summary || null,
      truthStatus: response.lifecycleState === 'blocked' ? 'DEGRADED' : response.truthStatus || 'LIVE',
    })
    res.json(enhanced)
  })

  app.post('/api/nettie/messages', requireBridgeToken, async (req, res) => {
    const message = String(req.body?.message || '').trim()
    const sender = req.body?.sender || 'Patrick'
    const channel = req.body?.channel || 'mission-control-bridge'

    if (!message) {
      return res.status(400).json({ delivered: false, reason: 'message_required', error: 'message is required' })
    }

    if (!shouldRouteChatToExecutor(message)) {
      const result = handleNettieInbound({ message, sender, channel })
      return res.status(result.statusCode).json({
        delivered: true,
        liveConversation: true,
        ...buildAssistantContract(result.payload),
        executorStatus: buildExecutorBridgeStatus(),
      })
    }

    addChatMessage({
      id: crypto.randomUUID(),
      from: sender,
      role: 'Operator',
      kind: 'command',
      channel,
      text: message,
      ts: nowIso(),
    })

    const executorStatus = buildExecutorBridgeStatus()
    if (!executorStatus.available) {
      const reply = {
        id: crypto.randomUUID(),
        from: 'Nettie',
        role: 'Executive Assistant',
        kind: 'ack',
        channel,
        text: 'Nettie: Executor unavailable. Command not delivered.',
        ts: nowIso(),
        jobId: null,
        workerId: null,
      }
      addChatMessage(reply)
      refreshDerivedState()
      return res.status(503).json({ delivered: false, reason: 'executor_unavailable', reply, executorStatus })
    }

    const requestedExecutor = isExplicitHermesRequest(message) ? 'hermes' : selectExecutor()
    const queued = await queueBridgeMessageForExecutor(message, requestedExecutor)

    if (!queued.ok || !queued.data?.jobId) {
      const failure = recordFailurePacket({
        owner: 'Van',
        category: 'runtime',
        title: 'API/runtime executor verification failed',
        reason: queued.data?.reason || queued.data?.error || 'executor rejected the request.',
        evidence: {
          operation: 'queue bridge request',
          endpoint: '/api/nettie/messages',
          error: queued.data?.reason || queued.data?.error || 'executor rejected the request.',
          notes: `requestedExecutor=${requestedExecutor}`,
        },
        source: '/api/nettie/messages',
        sourceRef: `queue:${requestedExecutor}:${message.slice(0, 80)}`,
        nextAction: 'Inspect the executor bridge rejection and repair the runtime/API path.',
      })
      const reply = {
        id: crypto.randomUUID(),
        from: 'Nettie',
        role: 'Executive Assistant',
        kind: 'ack',
        channel,
        text: `Nettie: Command not delivered. ${queued.data?.reason || queued.data?.error || 'executor rejected the request.'}\n\nPacket ID: ${failure.job.id}`,
        ts: nowIso(),
        jobId: queued.data?.jobId || failure.job.id,
        workerId: null,
      }
      addChatMessage(reply)
      refreshDerivedState()
      return res.status(queued.statusCode || 502).json({
        delivered: false,
        reason: queued.data?.reason || queued.data?.error || 'executor_rejected',
        reply,
        executorStatus,
      })
    }

    const reply = {
      id: crypto.randomUUID(),
      from: 'Nettie',
      role: 'Executive Assistant',
      kind: 'system',
      channel,
      text: `Queued\nJob ID: ${queued.data.jobId}\nStatus: ${queued.data.status || 'queued'}`,
      ts: nowIso(),
      jobId: queued.data.jobId,
      workerId: queued.data.worker?.id || null,
    }
    addChatMessage(reply)
    refreshDerivedState()

    return res.status(202).json({
      delivered: true,
      jobId: queued.data.jobId,
      status: queued.data.status || 'queued',
      reply,
      executorStatus: buildExecutorBridgeStatus(),
    })
  })

  app.post('/api/chat', async (req, res) => {
    const startedAt = Date.now()
    const message = String(req.body?.message || '').trim()
    const sender = req.body?.sender || 'Patrick'
    const channel = req.body?.channel || 'mission-control-ui'
    const intentType = classifyExecutionIntent(message)

    if (shouldRouteChatToExecutor(message)) {
      const requestedExecutor = isExplicitHermesRequest(message) ? 'hermes' : 'codex'
      console.log('[IRL ROUTE]', {
        message,
        intentType,
        routed: true,
        selectedExecutor: requestedExecutor,
      })
      addChatMessage({
        id: crypto.randomUUID(),
        from: sender,
        role: 'Operator',
        kind: 'command',
        channel,
        text: message,
        ts: nowIso(),
      })

      const assignedDepartmentHead = extractAgent(message) || 'Nettie'
      const inferredTask = extractTask(message)
      const hermesRes = await fetch('http://127.0.0.1:4174/api/hermes/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'Nettie',
          type: 'execution',
          inputPayload: {
            task: inferredTask,
            text: message,
            issuedAt: new Date().toISOString(),
            assignedDepartmentHead,
            workflow: buildDepartmentWorkflow(assignedDepartmentHead, inferredTask, buildReviewChain({ owner: assignedDepartmentHead, task: inferredTask, description: message })),
            executionPacket: {
              filesCreated: ['none'],
              filesModified: ['none'],
              filesDeleted: ['none'],
              behaviorChanged: 'None; executor route confirmation only.',
              behaviorUnchanged: 'Mission Control UI and adapter configuration remain unchanged.',
              commandsExecuted: ['Mission Control chat executor route'],
              exitCodes: { 'Mission Control chat executor route': 0 },
              risks: ['none'],
              nextPhase: 'Report executor route result.',
            },
          },
          executor: requestedExecutor,
        }),
      })

      const rawHermesBody = await hermesRes.text()
      let data = null
      try {
        data = rawHermesBody ? JSON.parse(rawHermesBody) : null
      } catch {
        data = {
          error: 'invalid_hermes_response',
          reason: 'Hermes returned a non-JSON response',
          rawPreview: rawHermesBody.slice(0, 200),
        }
      }
      const executorName = data.selectedExecutor
        ? data.selectedExecutor === 'hermes'
          ? 'Legacy Hermes manual'
          : `${String(data.selectedExecutor).charAt(0).toUpperCase()}${String(data.selectedExecutor).slice(1)}`
        : AI_EXECUTION_PROVIDER === 'codex'
          ? 'Codex'
          : 'Executor'
      const baseReplyText = hermesRes.ok
        ? `${executorName} execution initiated\nJob ID: ${data.jobId}\nStatus: ${data.status}`
        : `Execution blocked\nJob ID: ${data.jobId || 'n/a'}\nStatus: ${data.status || 'failed'}\nReason: ${data.result?.reason || data.reason || data.error || 'execution rejected'}`
      const failurePacket = (!hermesRes.ok || !data.jobId)
        ? recordFailurePacket({
          owner: /auth|access|security|credential|permission|policy/i.test(String(data.result?.reason || data.reason || data.error || '')) ? 'Perry' : 'Van',
          category: /auth|access|security|credential|permission|policy/i.test(String(data.result?.reason || data.reason || data.error || '')) ? 'security' : 'runtime',
          title: /routing|orchestr|process|dispatch|queue/i.test(String(data.result?.reason || data.reason || data.error || ''))
            ? 'Routing/process gap — terminal failure was not assigned'
            : (/auth|access|security|credential|permission|policy/i.test(String(data.result?.reason || data.reason || data.error || ''))
              ? 'Security/access/auth failure packet'
              : 'API/runtime executor verification failed'),
          reason: data.result?.reason || data.reason || data.error || 'execution rejected',
          evidence: {
            operation: 'Hermes executor execution',
            endpoint: '/api/hermes/execute',
            error: data.result?.reason || data.reason || data.error || 'execution rejected',
            stdout: rawHermesBody.slice(0, 500),
            notes: `selectedExecutor=${data.selectedExecutor || requestedExecutor}`,
          },
          source: '/api/chat',
          sourceRef: data.jobId ? `hermes:${data.jobId}` : `hermes:${requestedExecutor}:${message.slice(0, 80)}`,
          nextAction: /auth|access|security|credential|permission|policy/i.test(String(data.result?.reason || data.reason || data.error || ''))
            ? 'Review auth/access policy and retry the executor.'
            : 'Inspect the runtime/executor rejection and rerun the operation.',
        })
        : null
      const replyText = failurePacket ? `${baseReplyText}\n\nPacket ID: ${failurePacket.job.id}` : baseReplyText
      const outgoing = {
        id: crypto.randomUUID(),
        from: 'Nettie',
        role: 'Executive Assistant',
        kind: 'system',
        channel,
        text: replyText,
        ts: nowIso(),
        jobId: data.jobId || null,
        workerId: null,
      }

      addChatMessage(outgoing)
      refreshDerivedState()

      const durationMs = Date.now() - startedAt
      res.setHeader('X-MissionControl-LatencyMs', String(durationMs))
      const createdJob = data.jobId ? jobStore.getJobById(data.jobId) : null
      const routedOwner = createdJob?.inputPayload?.assignedDepartmentHead || createdJob?.owner || createdJob?.agent || 'Nettie'
      const workflow = createdJob?.workflow || (createdJob ? buildDepartmentWorkflow(routedOwner, createdJob.task || createdJob.title || message, buildReviewChain({ ...createdJob, owner: routedOwner })) : null)
      const createdJobView = createdJob ? { ...createdJob, owner: routedOwner, agent: routedOwner, workflow } : null
      recordRecursiveGovernanceDecision(runtimeDir, {
        source: 'api/chat',
        operator: sender,
        workflowId: data.jobId || createdJobView?.workflow?.department || null,
        jobId: data.jobId || createdJobView?.id || null,
        department: routedOwner,
        status: hermesRes.ok ? 'accepted' : 'blocked',
        decision: hermesRes.ok ? 'accepted' : 'blocked',
        correctionDirectives: hermesRes.ok ? [] : [data.result?.reason || data.reason || data.error || 'execution rejected'],
        nextPhaseDirectives: hermesRes.ok ? ['Monitor job ledger for execution updates.'] : ['Correct the rejection reason and retry through Nettie.'],
        evidence: {
          selectedExecutor: data.selectedExecutor || requestedExecutor,
          status: data.status || (hermesRes.ok ? 'queued' : 'failed'),
          createdJob: createdJobView,
        },
        replyMarkdown: outgoing.text,
        summary: hermesRes.ok ? 'Executor job initiated.' : 'Executor job blocked.',
        truthStatus: hermesRes.ok ? 'LIVE' : 'DEGRADED',
      })
      return res.status(hermesRes.ok ? 201 : hermesRes.status).json({
        reply: {
          from: 'Nettie',
          text: outgoing.text,
        },
        job: data,
        createdJob: createdJobView,
        intentType,
        routed: true,
        selectedExecutor: data.selectedExecutor || requestedExecutor,
      })
    }

    if (intentType === 'execution') {
      const routedResponse = await materializeNettieIntent({
        message,
        operator: sender,
        sender,
        channel,
        context: { source: '/api/chat', intentType },
        forceRoute: true,
        deps: {
          jobStore,
          buildMasterWorkRegistry: deps.buildMasterWorkRegistry,
          buildExecutorBridgeStatus: deps.buildExecutorBridgeStatus,
          selectExecutor,
          buildDepartmentWorkflow,
          buildReviewChain,
          extractAgent,
          extractTask,
          runtimeDir,
          nowIso,
          sourceLabel: '/api/chat',
        },
      })
      const enhanced = buildAssistantContract(routedResponse)
      saveNettieConversation(enhanced)
      addChatMessage({
        id: crypto.randomUUID(),
        from: 'Nettie',
        role: 'Executive Assistant',
        kind: 'system',
        channel,
        text: enhanced.reply?.text || enhanced.assistantReply || 'Nettie: Routed.',
        ts: nowIso(),
        jobId: enhanced.packetId || null,
        workerId: null,
      })
      refreshDerivedState()
      recordRecursiveGovernanceDecision(runtimeDir, {
        source: '/api/chat',
        operator: sender,
        workflowId: enhanced.executionId || enhanced.packetId || null,
        jobId: enhanced.packetId || null,
        department: enhanced.assignedDepartmentHead || enhanced.assignedAgent || 'Nettie',
        status: enhanced.lifecycleState === 'blocked' ? 'blocked' : 'accepted',
        decision: enhanced.lifecycleState === 'blocked' ? 'blocked' : 'accepted',
        correctionDirectives: enhanced.lifecycleState === 'blocked' && enhanced.blocker ? [enhanced.blocker] : [],
        nextPhaseDirectives: enhanced.suggestedNextSteps || [],
        evidence: {
          createdJobs: enhanced.createdJobs || [],
          executionId: enhanced.executionId || null,
          events: enhanced.events || [],
          blocker: enhanced.blocker || null,
        },
        replyMarkdown: enhanced.assistantReply || null,
        summary: enhanced.statusSummary || null,
        truthStatus: enhanced.lifecycleState === 'blocked' ? 'DEGRADED' : 'LIVE',
      })
      const durationMs = Date.now() - startedAt
      res.setHeader('X-MissionControl-LatencyMs', String(durationMs))
      return res.status(201).json({ ...enhanced, intentType, routed: true })
    }

    console.log('[IRL ROUTE]', {
      message,
      intentType,
      routed: false,
    })

    const result = handleNettieInbound({
      message: req.body?.message,
      sender,
      channel,
    })
    const durationMs = Date.now() - startedAt
    res.setHeader('X-MissionControl-LatencyMs', String(durationMs))
    return res.status(result.statusCode).json({ ...result.payload, intentType, routed: false })
  })

  app.post('/api/telegram/inbound', (req, res) => {
    const result = handleNettieInbound({
      message: req.body?.message,
      sender: req.body?.sender || 'Patrick',
      channel: 'telegram',
    })
    return res.status(result.statusCode).json(result.payload)
  })

  app.get('/api/telegram/status', async (_, res) => {
    if (!deps.telegramApiBase) {
      return res.json({ configured: false, webhookSecretConfigured: Boolean(deps.telegramWebhookSecret) })
    }
    try {
      const response = await fetch(`${deps.telegramApiBase}/getWebhookInfo`)
      const data = await response.json()
      return res.json({
        configured: true,
        webhookSecretConfigured: Boolean(deps.telegramWebhookSecret),
        webhookInfo: data?.result || null,
      })
    } catch (error) {
      return res.status(502).json({ configured: true, error: error.message })
    }
  })

  app.post('/api/telegram/set-webhook', async (req, res) => {
    if (!deps.telegramApiBase) return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN is not configured' })
    const url = String(req.body?.url || '').trim()
    if (!url) return res.status(400).json({ error: 'url is required' })

    try {
      const payload = { url, drop_pending_updates: false }
      if (deps.telegramWebhookSecret) payload.secret_token = deps.telegramWebhookSecret
      const response = await fetch(`${deps.telegramApiBase}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      return res.status(response.ok ? 200 : 502).json(data)
    } catch (error) {
      return res.status(502).json({ error: error.message })
    }
  })

  app.post('/api/telegram/webhook', async (req, res) => {
    if (telegramWebhookSecret) {
      const headerSecret = String(req.headers['x-telegram-bot-api-secret-token'] || '')
      if (headerSecret !== telegramWebhookSecret) {
        return res.status(403).json({ error: 'invalid_telegram_secret' })
      }
    }

    const extracted = extractTelegramMessage(req.body || {})
    if (!extracted) return res.status(200).json({ ok: true, ignored: true })

    const result = handleNettieInbound({
      message: extracted.text,
      sender: extracted.sender,
      channel: 'telegram',
    })

    try {
      await sendTelegramText(extracted.chatId, result.payload?.reply?.text || 'Nettie: Acknowledged.', extracted.threadId)
    } catch (error) {
      log('error', `Telegram send failed: ${error.message}`)
    }

    return res.status(200).json({ ok: true, routed: true, result: result.payload })
  })
}
