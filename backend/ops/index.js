export function registerOpsRoutes(app, deps) {
  const {
    runtimeDir,
    nowIso,
    saveSessionTelemetry,
    saveCooldownTelemetry,
    summarizeState,
    buildPlatformHealth,
    buildControlPlaneSnapshot,
    loadCIRegister,
    ingestIntoCIRegister,
    normalizeTaskKey,
    upsertCIEntry,
    scoreCIEntry,
    saveCIRegister,
    writeCIRegisterMd,
    intentAuditLog,
    getIRLSnapshot,
    PRIORITY_DOMAINS,
    instructionRegistry,
    saveIRLState,
    state,
    canonicalDepartmentHeadName,
    extractAgent,
    inferGoverningRunbook,
    validateExecutionPacket,
    validateRequiredArtifacts,
    getObservabilityView,
    getReconciliationQueuesView,
    getArchiveCandidatesView,
    getArchiveCompactionDryRunView,
    getQueueTopologyView,
    getDepartmentWorkflowRegistryView,
    getTokenTrackingOverviewView,
    buildQueueSummaryView,
    buildReportsStatusView,
    buildRuntimeHealthView,
    buildRecentActivityView,
    buildRuntimeAlertsView,
    buildGovernanceSummaryView,
    getRuntimeCheckpointView,
    persistRuntimeCheckpoint,
    getRuntimeSnapshotExportView,
    createRuntimeSummary,
    listRuntimeSummaries,
    getLatestRuntimeSummary,
    getRuntimeSummaryById,
    getCompactContextView,
    getContextEvictionCandidatesView,
    listReconciliationSnapshots,
    createReconciliationSnapshot,
    fs,
    path,
    getDepartmentHeadDir,
  } = deps

  app.get('/api/system', (_, res) => {
    const snapshot = summarizeState()
    res.json({
      system: snapshot.system,
      counts: snapshot.counts,
      agents: snapshot.agents,
      workers: snapshot.workers,
      jobs: snapshot.jobs,
    })
  })

  app.get('/api/dashboard', (_, res) => {
    res.json(summarizeState())
  })

  app.get('/api/system/health', (_, res) => {
    res.json(buildPlatformHealth())
  })

  app.get('/api/ops/observability', (_, res) => {
    res.json(getObservabilityView())
  })

  app.get('/api/reconciliation/queues', (_, res) => {
    res.json(getReconciliationQueuesView())
  })

  app.get('/api/reconciliation/queues/:type', (req, res) => {
    const view = getReconciliationQueuesView()
    const type = String(req.params.type || '')
    const queue = view.queues?.[type]
    if (!queue) return res.status(404).json({ error: 'Reconciliation queue not found' })
    res.json({ type, reconciliationDebtScore: view.reconciliationDebtScore, ...queue })
  })

  app.get('/api/archive/candidates', (_, res) => {
    res.json(getArchiveCandidatesView())
  })

  app.post('/api/archive/compact-dry-run', (_, res) => {
    res.json(getArchiveCompactionDryRunView())
  })

  app.get('/api/queue/topology', (_, res) => {
    res.json(getQueueTopologyView())
  })

  app.get('/api/departments/workflows', (_, res) => {
    res.json(getDepartmentWorkflowRegistryView())
  })

  app.get('/api/tokens/overview', (_, res) => {
    res.json(getTokenTrackingOverviewView())
  })

  app.get('/api/runtime/health', (_, res) => {
    res.json(buildRuntimeHealthView())
  })

  app.get('/api/queues/summary', (_, res) => {
    res.json(buildQueueSummaryView())
  })

  app.get('/api/reports/recent', (_, res) => {
    res.json(buildReportsStatusView().recent)
  })

  app.get('/api/reports/status', (_, res) => {
    res.json(buildReportsStatusView())
  })

  app.get('/api/reports/stale', (_, res) => {
    res.json(buildReportsStatusView().stale)
  })

  app.get('/api/activity/recent', (_, res) => {
    res.json(buildRecentActivityView())
  })

  app.get('/api/governance/summary', (_, res) => {
    res.json(buildGovernanceSummaryView())
  })

  app.get('/api/runtime/alerts', (_, res) => {
    res.json(buildRuntimeAlertsView())
  })

  app.get('/api/runtime/checkpoint', (_, res) => {
    res.json(getRuntimeCheckpointView())
  })

  app.post('/api/runtime/checkpoint', (_, res) => {
    const checkpoint = persistRuntimeCheckpoint()
    res.json({ saved: true, ...checkpoint })
  })

  app.get('/api/runtime/snapshot/export', (_, res) => {
    res.json(getRuntimeSnapshotExportView())
  })

  app.get('/api/runtime/snapshot', (_, res) => {
    res.json(getRuntimeSnapshotExportView())
  })

  app.get('/api/runtime/summaries', (_, res) => {
    res.json({ summaries: listRuntimeSummaries() })
  })

  app.get('/api/runtime/summaries/latest', (_, res) => {
    const summary = getLatestRuntimeSummary()
    if (!summary) return res.status(404).json({ error: 'No runtime summaries available' })
    res.json(summary)
  })

  app.post('/api/runtime/summaries/rollup', (req, res) => {
    const type = String(req.body?.type || 'manual')
    const summary = createRuntimeSummary(type)
    res.status(201).json(summary)
  })

  app.post('/api/runtime/summaries/compress', (req, res) => {
    const type = String(req.body?.type || 'manual')
    const summary = createRuntimeSummary(type)
    res.status(201).json(summary)
  })

  app.get('/api/runtime/summaries/chain', (_, res) => {
    res.json({ summaries: listRuntimeSummaries() })
  })

  app.get('/api/runtime/summaries/:id', (req, res) => {
    const summary = getRuntimeSummaryById(String(req.params.id || ''))
    if (!summary) return res.status(404).json({ error: 'Runtime summary not found' })
    res.json(summary)
  })

  app.get('/api/context/compact/:agent', (req, res) => {
    res.json(getCompactContextView(String(req.params.agent || 'nettie')))
  })

  app.get('/api/context/eviction-candidates', (_, res) => {
    res.json(getContextEvictionCandidatesView())
  })

  app.get('/api/reconciliation/snapshots', (_, res) => {
    res.json({ snapshots: listReconciliationSnapshots() })
  })

  app.post('/api/reconciliation/snapshots', (_, res) => {
    const snapshot = createReconciliationSnapshot()
    res.status(201).json(snapshot)
  })

  app.get('/api/logs', (_, res) => res.json(state.logs))

  app.get('/api/projects', (_, res) => {
    res.json(buildControlPlaneSnapshot().projects)
  })

  app.get('/api/reports', (_, res) => {
    res.json(buildControlPlaneSnapshot().reports)
  })

  app.get('/api/costs', (_, res) => {
    res.json(buildControlPlaneSnapshot().costs)
  })

  app.post('/api/costs/session', (req, res) => {
    try {
      const saved = saveSessionTelemetry(runtimeDir, req.body || {})
      res.status(201).json(saved)
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to save session telemetry' })
    }
  })

  app.post('/api/costs/cooldowns', (req, res) => {
    try {
      const saved = saveCooldownTelemetry(runtimeDir, req.body || {})
      res.status(201).json(saved)
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to save cooldown telemetry' })
    }
  })

  app.get('/api/qa', (_, res) => {
    res.json(buildControlPlaneSnapshot().qa)
  })

  app.get('/api/security/review', (_, res) => {
    res.json(buildControlPlaneSnapshot().security)
  })

  app.get('/api/decisions', (_, res) => {
    res.json(buildControlPlaneSnapshot().decisions)
  })

  app.get('/api/integrations', (_, res) => {
    res.json(buildControlPlaneSnapshot().integrations)
  })

  app.post('/api/perry/qa-gate', (req, res) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {}
    const producingAgent = canonicalDepartmentHeadName(payload.assignedDepartmentHead || payload.producingAgent || payload.owner || extractAgent(payload.task || payload.text || ''))
    const governingRunbook = inferGoverningRunbook(producingAgent, payload.task || payload.text || '', payload)
    const packetValidation = validateExecutionPacket(payload)
    const artifactValidation = validateRequiredArtifacts(producingAgent, governingRunbook, payload.task || payload.text || '', payload)
    const reasons = []

    if (!governingRunbook) reasons.push('no runbook used')
    else if (!fs.existsSync(path.join(getDepartmentHeadDir(producingAgent), governingRunbook))) reasons.push('no runbook used')
    if (artifactValidation.missing.length) reasons.push(`missing artifacts: ${artifactValidation.missing.join(', ')}`)
    if (packetValidation.missing.includes('behaviorChanged')) reasons.push('unclear behavior change')
    if (packetValidation.missing.includes('commandsExecuted')) reasons.push('no test evidence')
    if (packetValidation.missing.includes('exitCodes')) reasons.push('no exit code')
    if (packetValidation.missing.includes('risks')) reasons.push('no risks listed')
    if (packetValidation.missing.length && !packetValidation.missing.includes('behaviorChanged') && !packetValidation.missing.includes('commandsExecuted') && !packetValidation.missing.includes('exitCodes') && !packetValidation.missing.includes('risks')) {
      reasons.push(`execution packet incomplete: ${packetValidation.missing.join(', ')}`)
    }
    if (/\b(done|complete|completed|ready|shipped)\b/i.test(String(payload.claim || payload.summary || payload.text || '')) && !packetValidation.ok) {
      reasons.push('vague completion claim')
    }

    if (reasons.length) {
      return res.status(422).json({
        status: 'FAIL',
        rejectionReasons: reasons,
        assignedDepartmentHead: producingAgent || null,
        governingRunbook: governingRunbook || 'missing',
      })
    }

    return res.json({
      status: 'PASS',
      assignedDepartmentHead: producingAgent || null,
      governingRunbook,
    })
  })

  app.get('/api/ci/register', (_, res) => {
    const register = loadCIRegister()
    res.json(register)
  })

  app.get('/api/ci/priorities', (_, res) => {
    const register = loadCIRegister()
    const top = (register.entries || [])
      .filter(e => e.status === 'open')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    res.json({ count: top.length, priorities: top })
  })

  app.post('/api/ci/register/ingest', (_, res) => {
    const result = ingestIntoCIRegister()
    res.json({ ok: true, syncedAt: result.syncedAt, totalEntries: result.totalEntries, openCount: result.openCount })
  })

  app.post('/api/ci/register/entry', (req, res) => {
    const { title, type, description, urgency, impact, proposedFix, linkedJobIds, source } = req.body || {}
    if (!title) return res.status(400).json({ error: 'title required' })
    const fingerprint = `manual|${normalizeTaskKey(title).slice(0, 40)}`
    const register = loadCIRegister()
    const entry = upsertCIEntry(register, {
      fingerprint, title, type: type || 'improvement', description, urgency: urgency ?? 3,
      impact: impact ?? 3, proposedFix, linkedJobIds, source: source || 'manual',
    })
    register.syncedAt = nowIso()
    register.totalEntries = register.entries.length
    register.openCount = register.entries.filter(e => e.status === 'open').length
    saveCIRegister(register)
    writeCIRegisterMd(register)
    res.status(201).json({ ok: true, entry })
  })

  app.patch('/api/ci/register/:id', (req, res) => {
    const { status, proposedFix, resolvedAt } = req.body || {}
    const register = loadCIRegister()
    const entry = register.entries.find(e => e.id === req.params.id)
    if (!entry) return res.status(404).json({ error: 'CI entry not found' })
    if (status) entry.status = status
    if (proposedFix) entry.proposedFix = proposedFix
    if (status === 'resolved') entry.resolvedAt = resolvedAt || nowIso()
    entry.score = scoreCIEntry(entry)
    register.syncedAt = nowIso()
    register.openCount = register.entries.filter(e => e.status === 'open').length
    saveCIRegister(register)
    writeCIRegisterMd(register)
    res.json({ ok: true, entry })
  })

  app.get('/api/intent/audit', (req, res) => {
    res.json({ count: intentAuditLog.length, latest: intentAuditLog.slice(-25) })
  })

  app.get('/api/irl/state', (req, res) => {
    res.json(getIRLSnapshot())
  })

  app.get('/api/irl/rules', (req, res) => {
    const status = String(req.query.status || 'active')
    const domainFilter = req.query.domain ? String(req.query.domain) : null
    const domains = domainFilter ? [domainFilter] : PRIORITY_DOMAINS
    const rows = []
    for (const domain of domains) {
      if (!PRIORITY_DOMAINS.includes(domain)) continue
      for (const rule of instructionRegistry[domain] || []) {
        if (status !== 'all' && rule.status !== status) continue
        rows.push({ domain, status: rule.status, intent: rule.intent, rule: rule.rule, source: rule.source, addedAt: rule.addedAt, deprecatedAt: rule.deprecatedAt || null, behaviorKey: rule.behaviorKey || rule.intent, action: rule.action || null, deprecatedReason: rule.deprecatedReason || null, blockedBy: rule.blockedBy || null, replacedBy: rule.replacedBy || null })
      }
    }
    res.json({ status, domain: domainFilter || 'all', count: rows.length, rules: rows })
  })

  app.post('/api/irl/cleanup', (req, res) => {
    const { mode, domain, intent, confirm } = req.body || {}
    if (!mode) return res.status(400).json({ error: 'mode is required' })
    if (!['deprecated', 'intent'].includes(mode)) return res.status(400).json({ error: 'unsupported cleanup mode' })
    const touchedDomains = domain ? [domain] : PRIORITY_DOMAINS
    for (const d of touchedDomains) {
      if (!PRIORITY_DOMAINS.includes(d)) return res.status(400).json({ error: `unknown domain: ${d}` })
    }
    let removed = []
    for (const d of touchedDomains) {
      const before = instructionRegistry[d] || []
      if (mode === 'deprecated') {
        removed = removed.concat(before.filter(r => r.status === 'deprecated').map(r => ({ domain: d, ...r })))
        instructionRegistry[d] = before.filter(r => r.status !== 'deprecated')
      }
      if (mode === 'intent') {
        if (!intent) return res.status(400).json({ error: 'intent is required for intent cleanup' })
        if (confirm !== true) return res.status(400).json({ error: 'confirm:true is required for intent cleanup' })
        const normIntent = normalizeTaskKey(intent)
        removed = removed.concat(before.filter(r => normalizeTaskKey(r.intent) === normIntent).map(r => ({ domain: d, ...r })))
        instructionRegistry[d] = before.filter(r => normalizeTaskKey(r.intent) !== normIntent)
      }
    }
    instructionRegistry._changelog = [...(instructionRegistry._changelog || []), {
      ts: nowIso(), domain: domain || 'all', cleanupMode: mode, intent: intent || null, removedCount: removed.length,
    }].slice(-200)
    saveIRLState()
    res.json({ mode, domain: domain || 'all', intent: intent || null, removedCount: removed.length,
      removedRules: removed.map(r => ({ domain: r.domain, status: r.status, intent: r.intent, rule: r.rule })),
      snapshot: getIRLSnapshot() })
  })

  app.post('/api/irl/reconcile', (req, res) => {
    const { domain, rule, intent, source, behaviorKey, action } = req.body || {}
    if (!domain || !rule || !intent) return res.status(400).json({ error: 'domain, rule, and intent are required' })
    const result = deps.reconcileInstructions({ domain, rule, intent, source, behaviorKey, action }, instructionRegistry)
    Object.assign(instructionRegistry, result.canonicalInstructionSet)
    saveIRLState()
    res.json(result)
  })
}
