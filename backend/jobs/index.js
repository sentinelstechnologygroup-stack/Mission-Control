export function registerJobsRoutes(app, deps) {
  const {
    state,
    crypto,
    nowIso,
    jobStore,
    attachWorker,
    refreshDerivedState,
    findOpenDuplicateJob,
    saveJob,
    log,
    queryWorkStatus,
    buildMasterWorkRegistry,
    buildActiveWorkView,
    getQueuePrioritiesView,
    getTopNextActionsView,
    getDependencyGraphView,
    getJobDependencyDetail,
    getCooldownBlockedListArtifactView,
    getReconciliationDebtView,
    paginateItems,
    buildQueueSummaryView,
    buildRecentJobsView,
    buildBlockedJobsView,
    buildBlockedJobsClassifiedView,
    loadRecoveryLedger,
    syncRecoveryLedger,
    updateRecoveryEntry,
    markJobOutage,
    canonicalDepartmentHeadName,
    updateJobStatus,
    deriveWorkflowExecutions,
  } = deps

  app.get('/api/jobs', (_, res) => res.json(state.jobs.map(attachWorker)))
  app.get('/api/jobs/:id', (req, res) => {
    if (req.params.id === 'summary') {
      return res.json(buildQueueSummaryView())
    }
    if (req.params.id === 'recent') {
      const limit = Math.max(1, Math.min(50, Number(req.query?.limit || 20) || 20))
      return res.json(buildRecentJobsView(limit))
    }
    if (req.params.id === 'blocked') {
      return res.json(buildBlockedJobsClassifiedView())
    }
    if (req.params.id === 'stale') {
      return res.json(buildQueueSummaryView().staleJobs)
    }
    if (req.params.id === 'ledger') {
      const ledger = jobStore.deriveLedgerView()
      const summary = req.query?.summary === 'true'
      if (summary) {
        return res.json({
          count: ledger.length,
          page: 1,
          limit: Math.min(ledger.length, 25),
          total: ledger.length,
          items: ledger.slice(0, 25).map((job) => ({
            id: job.id,
            task: job.task || job.title,
            status: job.status,
            routeStatus: job.routeStatus || null,
            updatedAt: job.updatedAt,
          })),
        })
      }
      const page = Number(req.query?.page || 1)
      const limit = Number(req.query?.limit || ledger.length || 50)
      if (req.query?.page || req.query?.limit) {
        return res.json(paginateItems(ledger, { page, limit }))
      }
      return res.json(ledger)
    }
    const job = jobStore.getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    res.json(job)
  })

  app.post('/api/jobs', (req, res) => {
    const { title, owner = 'Nettie', priority = 'P1', description = '', dependsOn = [] } = req.body || {}
    if (!title) return res.status(400).json({ error: 'title is required' })

    const duplicate = findOpenDuplicateJob(owner, title)
    if (duplicate) {
      const existing = state.jobs.find((entry) => entry.id === duplicate.id)
      if (existing) {
        existing.updatedAt = nowIso()
        refreshDerivedState()
        return res.status(200).json({ ...attachWorker(existing), deduped: true })
      }
    }

    const job = {
      id: `job_${crypto.randomUUID().slice(0, 8)}`,
      title,
      owner,
      priority,
      stage: 'SCOPED',
      status: 'queued',
      description,
      workerId: null,
      updatedAt: nowIso(),
    }
    const created = saveJob({
      id: job.id,
      task: job.title,
      title: job.title,
      agent: job.owner,
      owner: job.owner,
      department: job.owner,
      description,
      status: job.status,
      routeStatus: 'queued',
      source: 'api.jobs.create',
      sourceType: 'mission-control',
      createdAt: job.updatedAt,
      updatedAt: job.updatedAt,
      dependsOn: Array.isArray(dependsOn) ? dependsOn : [],
    })
    log('info', `Created job ${job.id}: ${job.title}`)
    res.status(201).json(attachWorker(jobStore.toMissionStateJob(created || created.job || job)))
  })

  app.post('/api/jobs/:id/assign', (req, res) => {
    const job = jobStore.getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    const updated = jobStore.updateJob(job.id, { owner: req.body?.owner || job.owner, agent: req.body?.owner || job.agent, department: req.body?.owner || job.department, updatedAt: nowIso() })
    refreshDerivedState()
    res.json(updated)
  })

  app.post('/api/jobs/:id/transition', (req, res) => {
    const job = updateJobStatus(req.params.id, String(req.body?.stage || '').toLowerCase() || 'queued', { updatedAt: nowIso() })
    if (!job) return res.status(404).json({ error: 'Job not found' })
    refreshDerivedState()
    res.json(job)
  })

  app.post('/api/jobs/:id/run', (req, res) => {
    const job = jobStore.getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    const sessionId = String(req.headers['x-mc-session-id'] || req.body?.lockSession || '').trim() || null
    const lockActive = job.lockSession && job.lockExpiresAt && Date.parse(job.lockExpiresAt) > Date.now()
    if (lockActive && sessionId !== job.lockSession) {
      return res.status(409).json({
        error: 'job_locked',
        jobId: job.id,
        lockOwner: job.lockOwner,
        lockSession: job.lockSession,
        lockExpiresAt: job.lockExpiresAt,
        lockReason: job.lockReason,
      })
    }
    const dependency = getJobDependencyDetail(job.id)
    if (dependency?.dependencyStatus === 'blocked_by_dependency' || dependency?.dependencyStatus === 'orphan_dependency') {
      return res.status(409).json({
        error: dependency.dependencyStatus === 'orphan_dependency' ? 'orphan_dependency' : 'dependency_blocked',
        jobId: job.id,
        blockedBy: dependency.blockedBy,
        dependencyReason: dependency.dependencyReason,
      })
    }
    const updated = updateJobStatus(job.id, 'queued', {
      routeStatus: dependency?.dependencyStatus === 'unblock_ready' ? 'unblock_ready' : 'queued',
      dependencyStatus: dependency?.dependencyStatus || null,
      blockedBy: dependency?.blockedBy || [],
      updatedAt: nowIso(),
    })
    refreshDerivedState()
    res.json({ ok: true, job: updated })
  })

  app.get('/api/work/recovery-ledger', (_, res) => {
    const ledger = loadRecoveryLedger() || syncRecoveryLedger()
    res.json(ledger)
  })

  app.post('/api/work/recovery-ledger/sync', (_, res) => {
    const result = syncRecoveryLedger()
    if (!result) return res.status(500).json({ error: 'Sync failed' })
    res.json({ ok: true, syncedAt: result.syncedAt, totalEntries: result.totalEntries, outageFlags: result.outageFlags })
  })

  app.post('/api/work/recovery-ledger/update', (req, res) => {
    const { jobId, status, providerOutage, lastKnownGoodStep, resumeCommand, recoveryNote, nextAction, outageReason, artifactPath, projectPath } = req.body || {}
    if (!jobId) return res.status(400).json({ error: 'jobId required' })
    const patch = {}
    if (status !== undefined) patch.status = status
    if (providerOutage !== undefined) patch.providerOutage = providerOutage
    if (lastKnownGoodStep !== undefined) patch.lastKnownGoodStep = lastKnownGoodStep
    if (resumeCommand !== undefined) patch.resumeCommand = resumeCommand
    if (recoveryNote !== undefined) patch.recoveryNote = recoveryNote
    if (nextAction !== undefined) patch.nextAction = nextAction
    if (outageReason !== undefined) patch.outageReason = outageReason
    if (artifactPath !== undefined) patch.artifactPath = artifactPath
    if (projectPath !== undefined) patch.projectPath = projectPath
    updateRecoveryEntry(jobId, patch)
    res.json({ ok: true, jobId, patch, updatedAt: nowIso() })
  })

  app.post('/api/work/recovery-ledger/outage', (req, res) => {
    const { jobId, reason, lastKnownGoodStep, resumeCommand, artifactPath } = req.body || {}
    if (!jobId) return res.status(400).json({ error: 'jobId required' })
    markJobOutage(jobId, { reason, lastKnownGoodStep, resumeCommand, artifactPath })
    res.json({ ok: true, jobId, outageMarked: true })
  })

  app.get('/api/workflows/executions', (req, res) => {
    const executions = deriveWorkflowExecutions ? deriveWorkflowExecutions() : jobStore.deriveLedgerView().map((job) => job.workflowExecution || null).filter(Boolean)
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || executions.length || 50) || 50))
    const items = executions.slice(0, limit)
    if (req.query?.summary === 'true') {
      return res.json({
        count: executions.length,
        limit,
        items: items.map((execution) => ({
          executionId: execution.executionId,
          jobId: execution.jobId,
          title: execution.title,
          status: execution.status,
          routeStatus: execution.routeStatus,
          currentStep: execution.currentStep,
          updatedAt: execution.updatedAt,
          blockers: execution.blockers,
        })),
      })
    }
    res.json(items)
  })

  app.get('/api/workflows/executions/:id', (req, res) => {
    const executionId = String(req.params.id || '').trim()
    const executions = deriveWorkflowExecutions ? deriveWorkflowExecutions() : jobStore.deriveLedgerView().map((job) => job.workflowExecution || null).filter(Boolean)
    const execution = executions.find((item) => item.executionId === executionId || item.jobId === executionId)
    if (!execution) return res.status(404).json({ error: 'Workflow execution not found' })
    res.json(execution)
  })

  app.get('/api/jobs/ledger', (req, res) => {
    const ledger = jobStore.deriveLedgerView()
    const summary = req.query?.summary === 'true'
    if (summary) {
      return res.json({
        count: ledger.length,
        page: 1,
        limit: Math.min(ledger.length, 25),
        total: ledger.length,
        items: ledger.slice(0, 25).map((job) => ({
          id: job.id,
          task: job.task || job.title,
          status: job.status,
          routeStatus: job.routeStatus || null,
          updatedAt: job.updatedAt,
        })),
      })
    }
    const page = Number(req.query?.page || 1)
    const limit = Number(req.query?.limit || ledger.length || 50)
    if (req.query?.page || req.query?.limit) {
      return res.json(paginateItems(ledger, { page, limit }))
    }
    return res.json(ledger)
  })

  app.get('/api/work/registry', (req, res) => {
    const registry = buildMasterWorkRegistry()
    if (req.query?.summary === 'true') {
      return res.json({
        counts: {
          active: registry.active.length,
          queued: registry.queued.length,
          running: registry.running.length,
          paused: registry.paused.length,
          blocked: registry.blocked.length,
          completedRecent: registry.completedRecent.length,
        },
        sources: registry.sources,
      })
    }
    res.json(registry)
  })

  app.get('/api/work/status', (req, res) => {
    const project = String(req.query?.project || '').trim()
    const result = queryWorkStatus(project)
    res.json({
      project,
      matches: result.matches,
      counts: {
        active: result.registry.active.length,
        queued: result.registry.queued.length,
        running: result.registry.running.length,
        paused: result.registry.paused.length,
        blocked: result.registry.blocked.length,
        completedRecent: result.registry.completedRecent.length,
      },
      sources: result.registry.sources,
    })
  })

  app.get('/api/active-work', (_, res) => {
    const registry = buildMasterWorkRegistry()
    res.json(buildActiveWorkView(registry))
  })

  app.get('/api/queue/priorities', (req, res) => {
    res.json(getQueuePrioritiesView())
  })

  app.get('/api/jobs/summary', (_, res) => {
    res.json(buildQueueSummaryView())
  })

  app.get('/api/jobs/recent', (req, res) => {
    const limit = Math.max(1, Math.min(50, Number(req.query?.limit || 20) || 20))
    res.json(buildRecentJobsView(limit))
  })

  app.get('/api/jobs/blocked', (_, res) => {
    res.json(buildBlockedJobsClassifiedView())
  })

  app.get('/api/jobs/stale', (_, res) => {
    res.json(buildQueueSummaryView().staleJobs)
  })

  app.get('/api/queue/next-actions', (req, res) => {
    const limit = Math.max(1, Math.min(25, Number(req.query?.limit || 10) || 10))
    res.json(getTopNextActionsView(limit))
  })

  app.get('/api/jobs/:id/dependencies', (req, res) => {
    const detail = getJobDependencyDetail(req.params.id)
    if (!detail) return res.status(404).json({ error: 'Job dependency view not found' })
    res.json(detail)
  })

  app.get('/api/dependencies/blocked', (_, res) => {
    const graph = getDependencyGraphView()
    res.json({ generatedAt: graph.generatedAt, blocked: graph.blocked })
  })

  app.get('/api/dependencies/unblock-ready', (_, res) => {
    const graph = getDependencyGraphView()
    res.json({ generatedAt: graph.generatedAt, unblockReady: graph.unblockReady })
  })

  app.get('/api/dependencies/topology', (_, res) => {
    const graph = getDependencyGraphView()
    res.json(graph)
  })

  app.get('/api/recovery/mission-control-ledger-queue-blocked-list', (_, res) => {
    res.json(getCooldownBlockedListArtifactView())
  })

  app.get('/api/recovery/debt', (_, res) => {
    res.json(getReconciliationDebtView())
  })

  app.post('/api/jobs/:id/lock', (req, res) => {
    const job = jobStore.getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    const ttlSeconds = Math.max(30, Math.min(86400, Number(req.body?.ttlSeconds || 300) || 300))
    const lockSession = String(req.body?.lockSession || req.headers['x-mc-session-id'] || '').trim() || null
    const lockOwner = String(req.body?.lockOwner || job.owner || 'unknown').trim()
    const lockReason = String(req.body?.lockReason || 'manual execution').trim()
    const updated = saveJob({
      id: job.id,
      lockOwner,
      lockSession,
      lockExpiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      lockReason,
      updatedAt: nowIso(),
    })
    refreshDerivedState()
    res.json({ ok: true, job: updated })
  })

  app.patch('/api/jobs/ledger/:id/status', (req, res) => {
    const { status } = req.body || {}
    if (!status) return res.status(400).json({ error: 'status is required' })
    const job = updateJobStatus(req.params.id, status)
    if (!job) return res.status(404).json({ error: 'Job not found in ledger' })
    log('info', `Ledger: ${job.id} manually set to ${status}`)
    res.json(job)
  })
}
