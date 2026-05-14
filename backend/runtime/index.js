export function registerRuntimeRoutes(app, deps) {
  const {
    state,
    root,
    nowIso,
    codexAvailable,
    codexVersion,
    hermesAvailable,
    AI_EXECUTION_PROVIDER,
    AI_EXECUTION_FALLBACK,
    CODEX_CONNECTED_TEXT,
    lastExecutorErrorRef,
    setLastExecutorError,
    requireBridgeToken,
    buildExecutorBridgeStatus,
    getExecutorsHealth,
    runCodexSmokeTest,
    summarizeState,
    buildPlatformHealth,
    launchSelectedWorker,
    buildHermesContext,
    decomposeTask,
    assignAgentsToSteps,
    HERMES_ALLOWED_SOURCES,
    createHermesExecutionJob,
    updateJobStatus,
    makeHermesResponse,
    makeHermesLogs,
    validateHermesExecutionRequest,
    makeRunbookViolationResult,
    RUNBOOK_VIOLATION_REASON,
    normalizeTaskKey,
    jobsLedger,
    jobStore,
    normalizeHermesStatus,
    classifyExecutorError,
    stateWorkers,
  } = deps

  app.get('/api/health', (_, res) => {
    res.json({
      ok: true,
      codexAvailable,
      codexVersion,
      hermesAvailable,
      hermesMode: 'legacy/manual-only',
      selectedExecutor: AI_EXECUTION_PROVIDER,
      fallbackExecutor: AI_EXECUTION_FALLBACK,
      launchedAt: state.system.launchedAt,
    })
  })

  app.get('/api/executor/status', requireBridgeToken, (_, res) => {
    res.json(buildExecutorBridgeStatus())
  })

  app.get('/api/executors/health', async (_, res) => {
    const health = await getExecutorsHealth()
    res.json(health)
  })

  app.post('/api/executors/test', async (_, res) => {
    const result = await runCodexSmokeTest(
      'Reply with exactly: CODEX_EXECUTOR_CONNECTED',
      '/home/patrick/mission-control',
    )
    if (!result.ok) {
      setLastExecutorError({ executor: 'codex', type: result.codexAuthStatus, message: result.error, at: nowIso() })
    }
    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      expected: CODEX_CONNECTED_TEXT,
      output: result.output,
      codexAvailable: result.codexAvailable,
      codexVersion: result.codexVersion,
      codexAuthStatus: result.codexAuthStatus,
      error: result.error,
    })
  })

  app.post('/api/hermes/execute', (req, res) => {
    const source = String(req.body?.source || '').trim() || 'unknown'
    const type = String(req.body?.type || 'text').trim() || 'text'
    const inputPayload = req.body?.inputPayload && typeof req.body.inputPayload === 'object' ? req.body.inputPayload : {}
    const executeNow = req.body?.executeNow !== false
    const hermesContext = buildHermesContext()
    const receivedAt = nowIso()
    const steps = decomposeTask(inputPayload?.task || '')
    const executionAssignments = assignAgentsToSteps(steps, inputPayload?.task || '')

    if (!HERMES_ALLOWED_SOURCES.has(source)) {
      const job = createHermesExecutionJob({
        jobId: req.body?.jobId || null,
        source,
        type,
        inputPayload,
        context: hermesContext,
        decision: 'new',
        receivedAt,
        executionPlan: steps,
        executionAssignments,
      })
      const failedAt = nowIso()
      const result = { error: 'source_not_allowed' }
      const failedJob = updateJobStatus(job.id, 'failed', {
        updatedAt: failedAt,
        completedAt: failedAt,
        context: hermesContext,
        outputPayload: result,
        executionTrace: [{ step: 'source_rejected', at: failedAt, level: 'error', message: 'failed', data: { source } }],
      })
      return res.status(403).json(makeHermesResponse(failedJob, result, makeHermesLogs(failedJob, failedJob.executionTrace)))
    }

    const validation = validateHermesExecutionRequest(inputPayload, req.body?.assignedDepartmentHead || '')
    if (!validation.ok) {
      const job = createHermesExecutionJob({
        jobId: req.body?.jobId || null,
        source,
        type,
        inputPayload: {
          ...(inputPayload && typeof inputPayload === 'object' ? inputPayload : {}),
          assignedDepartmentHead: validation.assignedDepartmentHead,
          governingRunbook: validation.governingRunbook,
        },
        context: hermesContext,
        decision: 'new',
        receivedAt,
        executionPlan: steps,
        executionAssignments,
      })
      const failedAt = nowIso()
      const result = makeRunbookViolationResult(validation)
      const failedJob = updateJobStatus(job.id, 'failed', {
        updatedAt: failedAt,
        completedAt: failedAt,
        routeStatus: 'blocked-runbook-violation',
        context: hermesContext,
        outputPayload: result,
        executionTrace: [{ step: 'execution_rejected', at: failedAt, level: 'error', message: RUNBOOK_VIOLATION_REASON, data: result }],
      })
      return res.status(422).json(makeHermesResponse(failedJob, result, makeHermesLogs(failedJob, failedJob.executionTrace), { reused: false }))
    }

    const normTask = normalizeTaskKey(inputPayload?.task || '')
    const existing = normTask
      ? jobsLedger.find(j =>
          normalizeTaskKey(j.inputPayload?.task || '') === normTask &&
          !['completed', 'complete', 'cancelled', 'failed'].includes(j.status)
        )
      : null

    if (existing) {
      const reusedJob = updateJobStatus(existing.id, existing.status, {
        updatedAt: receivedAt,
        context: hermesContext,
        executionPlan: existing.executionPlan?.length ? existing.executionPlan : steps,
        executionAssignments: existing.executionAssignments?.length ? existing.executionAssignments : executionAssignments,
        executionTrace: [{
          step: 'execution_received',
          at: receivedAt,
          level: 'info',
          message: 'reused',
          data: {
            receivedAt,
            contextSnapshot: hermesContext,
            decision: 'reused',
          },
        }],
      })
      const statusCode = normalizeHermesStatus(reusedJob.status) === 'queued' ? 202 : 200
      return res.status(statusCode).json(
        makeHermesResponse(
          reusedJob,
          reusedJob.outputPayload ?? null,
          makeHermesLogs(reusedJob, reusedJob.executionTrace),
          { reused: true },
        )
      )
    }

    const job = createHermesExecutionJob({
      jobId: req.body?.jobId || null,
      source,
      type,
      inputPayload: {
        ...(inputPayload && typeof inputPayload === 'object' ? inputPayload : {}),
        assignedDepartmentHead: validation.assignedDepartmentHead,
        governingRunbook: validation.governingRunbook,
      },
      context: hermesContext,
      decision: 'new',
      receivedAt,
      executionPlan: steps,
      executionAssignments,
    })

    if (!executeNow) {
      return res.status(202).json(makeHermesResponse(job, null, makeHermesLogs(job, job.executionTrace), { reused: false }))
    }

    try {
      const workerJob = {
        ...job,
        title: job.title || job.task || 'Execution job',
        owner: validation.assignedDepartmentHead || job.owner || job.agent || 'Van',
        priority: job.priority || 'P1',
        stage: job.stage || 'SCOPED',
        description: job.description || inputPayload?.text || inputPayload?.task || '',
        inputPayload: job.inputPayload || inputPayload,
        projectPath: inputPayload?.projectPath || inputPayload?.project_path || inputPayload?.cwd || root,
      }
      const worker = launchSelectedWorker(workerJob, inputPayload?.text || inputPayload?.task || '', req.body?.executor || req.body?.provider || '')
      const runningJob = jobStore.getJobById(job.id) || workerJob
      return res.status(202).json({
        ...makeHermesResponse(runningJob, null, makeHermesLogs(runningJob, runningJob.executionTrace), { reused: false }),
        selectedExecutor: worker.executor,
        worker,
      })
    } catch (error) {
      const failedAt = nowIso()
      const classification = classifyExecutorError({ error, stderr: error.message, code: 1, executor: 'executor' })
      setLastExecutorError({ executor: 'selected', ...classification, at: failedAt })
      const failedResult = { error: classification.message, classification }
      const failedJob = updateJobStatus(job.id, 'failed', {
        updatedAt: failedAt,
        completedAt: failedAt,
        outputPayload: failedResult,
        executionTrace: [{ step: 'executor_launch_failed', at: failedAt, level: 'error', message: classification.message, data: classification }],
      })
      return res.status(503).json(makeHermesResponse(failedJob, failedResult, makeHermesLogs(failedJob, failedJob.executionTrace), { reused: false }))
    }
  })

  app.get('/api/workers', (_, res) => res.json(stateWorkers()))
  app.get('/api/workers/:id', (req, res) => {
    const worker = stateWorkers().find((entry) => entry.id === req.params.id)
    if (!worker) return res.status(404).json({ error: 'Worker not found' })
    res.json(worker)
  })
  app.post('/api/workers/:id/stop', (req, res) => {
    const worker = stateWorkers().find((entry) => entry.id === req.params.id)
    if (!worker) return res.status(404).json({ error: 'Worker not found' })
    const process = deps.runningWorkers.get(worker.id)
    if (!process) return res.status(409).json({ error: 'Worker is not running' })
    process.kill('SIGTERM')
    res.json({ ok: true, workerId: worker.id })
  })
}
