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
    governanceState,
    reconcileGovernedRuntimeState,
    evaluateHermesGovernance,
    getRecoveryReconciliationReport,
    buildAndPersistRecoveryReconciliationReport,
    buildRuntimeReconciliationView,
    buildRuntimeLocksView,
    getJobDependencyDetail,
    getExecutorForecastView,
    getRestartStateView,
    claimLocalBridgeJob,
    heartbeatLocalBridgeJob,
    completeLocalBridgeJob,
    failLocalBridgeJob,
    reconcileStaleLocalBridgeJobs,
    runNextLocalBridgeJob,
    createLocalBridgeJob,
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

  app.get('/api/executors/status', requireBridgeToken, (_, res) => {
    res.json(buildExecutorBridgeStatus())
  })

  app.get('/api/executors', requireBridgeToken, async (_, res) => {
    const status = buildExecutorBridgeStatus()
    const health = await getExecutorsHealth()
    res.json({
      selectedExecutor: status.selectedExecutor,
      runtime: status.runtime,
      executors: [
        {
          id: 'gpt_codex',
          family: 'gpt',
          available: Boolean(health?.codex?.available || status.executor === 'codex'),
          selected: status.selectedExecutor === 'codex',
          coolingDown: Boolean(status.executorCoolingDown && status.selectedExecutor === 'codex'),
          role: 'technical_execution',
        },
        {
          id: 'claude_cli',
          family: 'claude',
          available: Boolean(status.claude_cli?.reliable),
          selected: status.selectedExecutor === 'claude_cli',
          coolingDown: false,
          role: 'long_context_reasoning',
          mode: status.claude_cli?.mode || 'manual_only',
        },
        {
          id: 'local_ollama',
          family: 'local',
          available: false,
          selected: status.selectedExecutor === 'ollama',
          coolingDown: false,
          role: 'draft_triage_only',
          mode: 'draft_only',
        },
        {
          id: 'hermes',
          family: 'runtime',
          available: Boolean(status.fallback?.available),
          selected: status.selectedExecutor === 'hermes',
          coolingDown: false,
          role: 'governed_execution_adapter',
          mode: status.fallback?.mode || 'manual-only',
        },
      ],
    })
  })

  app.get('/api/executors/budget', requireBridgeToken, (_, res) => {
    const status = buildExecutorBridgeStatus()
    res.json({
      runtime: status.runtime,
      selectedExecutor: status.selectedExecutor,
      providerState: {
        available: status.available,
        ready: status.executorReady,
        coolingDown: status.executorCoolingDown,
        cooldown: status.cooldown,
        fallback: status.fallback,
        lastError: status.lastError,
      },
      budget: {
        burnRateClass: status.executorCoolingDown ? 'blocked' : 'normal',
        recommendedExecutionWindow: status.executorCoolingDown ? 'wait_for_recovery' : 'operator_window_ok',
        queueDepth: status.queueDepth,
      },
    })
  })

  app.get('/api/executors/forecast', requireBridgeToken, (_, res) => {
    res.json(getExecutorForecastView())
  })

  app.get('/api/runtime/restart-state', (_, res) => {
    res.json(getRestartStateView())
  })

  app.get('/api/runtime/recovery', requireBridgeToken, (_, res) => {
    const report = getRecoveryReconciliationReport() || buildAndPersistRecoveryReconciliationReport()
    res.json(report)
  })

  app.get('/api/runtime/reconciliation', (_, res) => {
    res.json(buildRuntimeReconciliationView())
  })

  app.get('/api/runtime/locks', (_, res) => {
    res.json(buildRuntimeLocksView())
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

    const reconciliation = reconcileGovernedRuntimeState({ providerHealthy: true })
    const reconciledJob = jobStore.getJobById(job.id) || job
    if (reconciliation?.gated) {
      const gatedAt = nowIso()
      const gatedJob = updateJobStatus(job.id, 'paused', {
        updatedAt: gatedAt,
        routeStatus: 'reconciliation_required',
        recoveryNote: 'Execution frozen pending recovery reconciliation gate.',
        nextAction: 'Review /api/runtime/recovery and classify safe_to_resume jobs before resuming.',
        providerOutage: false,
        executionTrace: [{
          step: 'recovery_reconciliation_gate',
          at: gatedAt,
          level: 'warn',
          message: reconciliation.reason || 'Recovery reconciliation gate active.',
          data: {
            reconciliationRequired: true,
            autoResumeEnabled: false,
          },
        }],
      })
      return res.status(202).json(makeHermesResponse(gatedJob, {
        paused: true,
        reason: reconciliation.reason || 'Recovery reconciliation gate active.',
        classification: 'reconciliation_required',
      }, makeHermesLogs(gatedJob, gatedJob.executionTrace), { reused: false }))
    }
    if (String(reconciledJob.routeStatus || '') === 'paused_provider_blocked') {
      return res.status(202).json(makeHermesResponse(reconciledJob, {
        paused: true,
        reason: reconciledJob.outageReason || 'provider cooldown active',
        classification: 'blocked_by_provider',
      }, makeHermesLogs(reconciledJob, reconciledJob.executionTrace), { reused: false }))
    }

    const dependencyDetail = getJobDependencyDetail(job.id)
    if (dependencyDetail?.dependencyStatus === 'blocked_by_dependency') {
      const blockedAt = nowIso()
      const blockedJob = updateJobStatus(job.id, 'blocked', {
        updatedAt: blockedAt,
        routeStatus: 'dependency_blocked',
        blockedBy: dependencyDetail.blockedBy,
        dependencyStatus: dependencyDetail.dependencyStatus,
        dependencyReason: dependencyDetail.dependencyReason,
        nextAction: dependencyDetail.dependencyReason || 'Wait for prerequisite jobs to complete.',
        executionTrace: [{
          step: 'dependency_blocked',
          at: blockedAt,
          level: 'warn',
          message: dependencyDetail.dependencyReason || 'Job blocked by dependency chain.',
          data: dependencyDetail,
        }],
      })
      return res.status(202).json(makeHermesResponse(blockedJob, {
        paused: true,
        reason: dependencyDetail.dependencyReason || 'Job is dependency-blocked.',
        classification: 'dependency_blocked',
      }, makeHermesLogs(blockedJob, blockedJob.executionTrace), { reused: false }))
    }

    if ((req.body?.executor || req.body?.provider || '').toLowerCase() === 'hermes') {
      const governance = evaluateHermesGovernance({
        mcRuntimeOnline: true,
        breakGlassMode: Boolean(req.body?.breakGlassMode || inputPayload?.breakGlassMode),
        hasApprovedOperatorCommand: source === 'Nettie',
        hasJobRecord: Boolean(job.id),
        actionType: req.body?.breakGlassMode || inputPayload?.breakGlassMode ? 'recovery_diagnostic' : 'project_execution',
        task: inputPayload?.text || inputPayload?.task || '',
      })
      if (!governance.allowed) {
        const blockedAt = nowIso()
        const blockedJob = updateJobStatus(job.id, 'paused_provider_blocked', {
          updatedAt: blockedAt,
          routeStatus: 'paused_provider_blocked',
          outageReason: governance.reason,
          recoveryNote: 'Governance policy blocked Hermes normal execution.',
          nextAction: 'Use break-glass recovery mode only for diagnostics while MC governance remains enforced.',
          providerOutage: false,
          executionTrace: [{ step: 'hermes_governance_blocked', at: blockedAt, level: 'warn', message: governance.reason, data: governance }],
        })
        return res.status(403).json(makeHermesResponse(blockedJob, { error: governance.reason, governance }, makeHermesLogs(blockedJob, blockedJob.executionTrace), { reused: false }))
      }
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
      const pausedForProvider = classification.type === 'rate_limited'
      const failedResult = { error: classification.message, classification }
      const failedJob = updateJobStatus(job.id, pausedForProvider ? 'paused_provider_blocked' : 'failed', {
        updatedAt: failedAt,
        completedAt: pausedForProvider ? null : failedAt,
        routeStatus: pausedForProvider ? 'paused_provider_blocked' : undefined,
        providerOutage: pausedForProvider,
        outageReason: pausedForProvider ? classification.message : undefined,
        recoveryNote: pausedForProvider ? 'Execution paused during provider cooldown/rate limit.' : undefined,
        nextAction: pausedForProvider ? 'Resume after provider cooldown clears.' : undefined,
        resumeCommand: pausedForProvider ? `resume ${job.id}` : undefined,
        outputPayload: failedResult,
        executionTrace: [{ step: 'executor_launch_failed', at: failedAt, level: 'error', message: classification.message, data: classification }],
      })
      return res.status(pausedForProvider ? 202 : 503).json(makeHermesResponse(failedJob, failedResult, makeHermesLogs(failedJob, failedJob.executionTrace), { reused: false }))
    }
  })

  app.get('/api/workers', (_, res) => res.json(stateWorkers()))
  app.get('/api/workers/:id', (req, res) => {
    const worker = stateWorkers().find((entry) => entry.id === req.params.id)
    if (!worker) return res.status(404).json({ error: 'Worker not found' })
    res.json(worker)
  })

  app.post('/api/local-bridge/jobs', (req, res) => {
    const owner = String(req.body?.owner || 'Van')
    const task = String(req.body?.task || '').trim()
    if (!task) return res.status(400).json({ error: 'task_required' })
    const job = createLocalBridgeJob({
      owner,
      task,
      projectPath: req.body?.projectPath || root,
      commands: Array.isArray(req.body?.commands) ? req.body.commands : [],
      source: 'local-bridge-api',
      autoExecute: Boolean(req.body?.autoExecute),
    })
    return res.status(201).json({ job })
  })

  app.post('/api/local-bridge/claim', (req, res) => {
    const job = claimLocalBridgeJob({ bridgeId: req.body?.bridgeId || 'local-bridge', preferredJobId: req.body?.preferredJobId || '' })
    if (!job) return res.status(404).json({ error: 'no_claimable_job' })
    return res.json({ job })
  })

  app.post('/api/local-bridge/jobs/:id/heartbeat', (req, res) => {
    const job = heartbeatLocalBridgeJob(req.params.id, req.body?.bridgeId || 'local-bridge')
    if (!job) return res.status(404).json({ error: 'job_not_found' })
    return res.json({ job })
  })

  app.post('/api/local-bridge/jobs/:id/complete', (req, res) => {
    const result = completeLocalBridgeJob(req.params.id, req.body?.evidence || req.body?.result, req.body?.bridgeId || 'local-bridge')
    if (result?.error) return res.status(422).json(result)
    return res.status(result.perryReviewRequired ? 202 : 200).json(result)
  })

  app.post('/api/local-bridge/jobs/:id/fail', (req, res) => {
    const result = failLocalBridgeJob(req.params.id, req.body?.evidence || req.body?.result || {}, req.body?.bridgeId || 'local-bridge')
    return res.status(result.perryReviewRequired ? 202 : 200).json(result)
  })

  app.post('/api/local-bridge/reconcile-stale', (req, res) => {
    const staleAfterMs = req.body?.staleAfterMs === 0 ? 0 : (Number(req.body?.staleAfterMs || NaN))
    return res.json(reconcileStaleLocalBridgeJobs(Number.isFinite(staleAfterMs) ? staleAfterMs : undefined))
  })

  app.post('/api/local-bridge/run-next', async (req, res) => {
    const result = await runNextLocalBridgeJob({ bridgeId: req.body?.bridgeId || 'local-bridge', preferredJobId: req.body?.preferredJobId || '' })
    if (!result) return res.status(404).json({ error: 'no_claimable_job' })
    return res.status(result.perryReviewRequired ? 202 : 200).json(result)
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
