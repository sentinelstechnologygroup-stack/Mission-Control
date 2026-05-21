import { buildSeedState, buildWorkflowBundle } from '../../src/lib/auroraPoc.js'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function sortNewestFirst(items = []) {
  return [...items].sort((a, b) => String(b.created_at || b.updated_at || b.completed_at || '').localeCompare(String(a.created_at || a.updated_at || a.completed_at || '')))
}

function ensureAuroraState(state, persistState) {
  const seed = buildSeedState()
  const current = state.aurora && typeof state.aurora === 'object' ? state.aurora : null
  const merged = {
    ...seed,
    ...current,
    jobs: Array.isArray(current?.jobs) && current.jobs.length ? current.jobs : seed.jobs,
    department_workflows: Array.isArray(current?.department_workflows) && current.department_workflows.length ? current.department_workflows : seed.department_workflows,
    workflow_nodes: Array.isArray(current?.workflow_nodes) && current.workflow_nodes.length ? current.workflow_nodes : seed.workflow_nodes,
    workflow_edges: Array.isArray(current?.workflow_edges) && current.workflow_edges.length ? current.workflow_edges : seed.workflow_edges,
    evidence_logs: Array.isArray(current?.evidence_logs) && current.evidence_logs.length ? current.evidence_logs : seed.evidence_logs,
    agent_messages: Array.isArray(current?.agent_messages) && current.agent_messages.length ? current.agent_messages : seed.agent_messages,
    model_runs: Array.isArray(current?.model_runs) && current.model_runs.length ? current.model_runs : seed.model_runs,
    nettie_feed: Array.isArray(current?.nettie_feed) && current.nettie_feed.length ? current.nettie_feed : seed.nettie_feed,
  }

  const changed = !current
    || merged.jobs !== current.jobs
    || merged.department_workflows !== current.department_workflows
    || merged.workflow_nodes !== current.workflow_nodes
    || merged.workflow_edges !== current.workflow_edges
    || merged.evidence_logs !== current.evidence_logs
    || merged.agent_messages !== current.agent_messages
    || merged.model_runs !== current.model_runs
    || merged.nettie_feed !== current.nettie_feed

  state.aurora = merged
  if (changed && typeof persistState === 'function') persistState()
  return state.aurora
}

function findBundleByJobId(auroraState, jobId) {
  const jobs = Array.isArray(auroraState?.jobs) ? auroraState.jobs : []
  const job = jobs.find((entry) => entry.id === jobId) || null
  if (!job) return null
  return {
    job,
    workflow: (auroraState.department_workflows || []).find((entry) => entry.job_id === jobId) || null,
    nodes: (auroraState.workflow_nodes || []).filter((entry) => entry.job_id === jobId).sort((a, b) => a.node_order - b.node_order),
    edges: (auroraState.workflow_edges || []).filter((entry) => entry.job_id === jobId),
    evidenceLogs: (auroraState.evidence_logs || []).filter((entry) => entry.job_id === jobId).sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || ''))),
    agentMessages: (auroraState.agent_messages || []).filter((entry) => entry.job_id === jobId).sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))),
    modelRuns: (auroraState.model_runs || []).filter((entry) => entry.job_id === jobId),
    nettieReply: (auroraState.nettie_feed || []).find((entry) => entry.job_id === jobId) || null,
  }
}

function upsertBundle(state, bundle, persistState) {
  const auroraState = ensureAuroraState(state, persistState)
  const jobId = bundle.job.id

  auroraState.jobs = sortNewestFirst([
    bundle.job,
    ...(auroraState.jobs || []).filter((entry) => entry.id !== jobId),
  ])
  auroraState.department_workflows = [
    bundle.workflow,
    ...(auroraState.department_workflows || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.workflow_nodes = [
    ...bundle.nodes,
    ...(auroraState.workflow_nodes || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.workflow_edges = [
    ...bundle.edges,
    ...(auroraState.workflow_edges || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.evidence_logs = [
    ...bundle.evidenceLogs,
    ...(auroraState.evidence_logs || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.agent_messages = [
    ...bundle.agentMessages,
    ...(auroraState.agent_messages || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.model_runs = [
    ...bundle.modelRuns,
    ...(auroraState.model_runs || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.nettie_feed = [
    bundle.nettieReply,
    ...(auroraState.nettie_feed || []).filter((entry) => entry.job_id !== jobId),
  ]
  auroraState.activeDepartment = bundle.route?.department || auroraState.activeDepartment || 'Dana'
  auroraState.selectedJobId = jobId
  auroraState.selectedNodeId = bundle.nodes.find((node) => node.status === 'blocked')?.id
    || bundle.nodes.find((node) => node.status === 'awaiting_approval')?.id
    || bundle.nodes[bundle.nodes.length - 1]?.id
    || null

  if (typeof persistState === 'function') persistState()
  return auroraState
}

export function registerAuroraRoutes(app, deps) {
  const {
    state,
    nowIso,
    persistState,
    log,
  } = deps

  ensureAuroraState(state, persistState)

  app.get('/api/aurora/state', (_, res) => {
    res.json(clone(state.aurora))
  })

  app.get('/api/aurora/jobs', (_, res) => {
    res.json(clone(state.aurora.jobs || []))
  })

  app.post('/api/aurora/jobs', (req, res) => {
    const command = String(req.body?.command || req.body?.title || req.body?.message || '').trim()
    if (!command) return res.status(400).json({ error: 'command is required' })

    const bundle = buildWorkflowBundle(command, { createdAt: nowIso() })
    const auroraState = upsertBundle(state, bundle, persistState)
    log?.('info', `Aurora job persisted: ${bundle.job.id} (${bundle.route.department})`)

    res.status(201).json({
      ok: true,
      command,
      bundle: clone(bundle),
      state: clone(auroraState),
    })
  })

  app.get('/api/aurora/jobs/:id', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora job not found' })
    res.json(clone(bundle.job))
  })

  app.get('/api/aurora/jobs/:id/workflow', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora workflow not found' })
    res.json(clone(bundle.workflow))
  })

  app.get('/api/aurora/jobs/:id/nodes', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora workflow nodes not found' })
    res.json(clone(bundle.nodes))
  })

  app.get('/api/aurora/jobs/:id/edges', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora workflow edges not found' })
    res.json(clone(bundle.edges))
  })

  app.get('/api/aurora/jobs/:id/evidence', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora evidence not found' })
    res.json(clone(bundle.evidenceLogs))
  })

  app.get('/api/aurora/jobs/:id/messages', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora messages not found' })
    res.json(clone(bundle.agentMessages))
  })

  app.get('/api/aurora/jobs/:id/model-runs', (req, res) => {
    const bundle = findBundleByJobId(state.aurora, req.params.id)
    if (!bundle) return res.status(404).json({ error: 'Aurora model runs not found' })
    res.json(clone(bundle.modelRuns))
  })
}
