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
    loadRecoveryLedger,
    syncRecoveryLedger,
    updateRecoveryEntry,
    markJobOutage,
    canonicalDepartmentHeadName,
    updateJobStatus,
  } = deps

  app.get('/api/jobs', (_, res) => res.json(state.jobs.map(attachWorker)))
  app.get('/api/jobs/:id', (req, res) => {
    if (req.params.id === 'ledger') return res.json(jobStore.deriveLedgerView())
    const job = jobStore.getJobById(req.params.id)
    if (!job) return res.status(404).json({ error: 'Job not found' })
    res.json(job)
  })

  app.post('/api/jobs', (req, res) => {
    const { title, owner = 'Nettie', priority = 'P1', description = '' } = req.body || {}
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
      status: job.status,
      routeStatus: 'queued',
      source: 'api.jobs.create',
      sourceType: 'mission-control',
      createdAt: job.updatedAt,
      updatedAt: job.updatedAt,
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
    const updated = updateJobStatus(job.id, 'queued', { routeStatus: 'queued', updatedAt: nowIso() })
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

  app.get('/api/jobs/ledger', (_, res) => res.json(jobStore.deriveLedgerView()))

  app.get('/api/work/registry', (_, res) => {
    const registry = buildMasterWorkRegistry()
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

  app.get('/api/queue/next-actions', (req, res) => {
    const limit = Math.max(1, Math.min(25, Number(req.query?.limit || 10) || 10))
    res.json(getTopNextActionsView(limit))
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
