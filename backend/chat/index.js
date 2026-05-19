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

    const response = await buildNettieCommandResponse({
      message,
      operator,
      context,
      now: nowIso(),
      sources: {
        queueSummary: async () => deps.buildQueueSummaryView(),
        jobsBlocked: async () => deps.buildBlockedJobsClassifiedView(),
        jobsStale: async () => deps.buildQueueSummaryView().staleJobs,
        reportsStatus: async () => deps.buildReportsStatusView(),
        runtimeHealth: async () => deps.buildRuntimeHealthView(),
        runtimeReconciliation: async () => deps.buildRuntimeReconciliationView(),
        runtimeLocks: async () => deps.buildRuntimeLocksView(),
        triageSummary: async () => deps.buildTriageSummaryView(),
        workRegistry: async () => deps.buildMasterWorkRegistry(),
      },
      actions: {
        routeAssignment: async (commandMessage) => handleAssignment(commandMessage, 'api/nettie/command'),
      },
    })

    const record = {
      ...response,
      createdJobs: (response.createdJobs || []).map((job) => ({
        jobId: job.jobId || job.id,
        task: job.task || job.title || 'Untitled job',
        owner: job.owner || job.agent || job.department || 'Unknown',
        status: job.status || 'queued',
      })),
      approvalRequired: response.requiresApproval,
    }
    saveNettieConversation(record)
    res.json(response)
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
        ...result.payload,
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
      const reply = {
        id: crypto.randomUUID(),
        from: 'Nettie',
        role: 'Executive Assistant',
        kind: 'ack',
        channel,
        text: `Nettie: Command not delivered. ${queued.data?.reason || queued.data?.error || 'executor rejected the request.'}`,
        ts: nowIso(),
        jobId: queued.data?.jobId || null,
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
      const replyText = hermesRes.ok
        ? `${executorName} execution initiated\nJob ID: ${data.jobId}\nStatus: ${data.status}`
        : `Execution blocked\nJob ID: ${data.jobId || 'n/a'}\nStatus: ${data.status || 'failed'}\nReason: ${data.result?.reason || data.reason || data.error || 'execution rejected'}`
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
