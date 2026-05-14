export function registerAgentsRoutes(app, deps) {
  const { buildControlPlaneSnapshot, getAgentRegistryView, getAgentRegistryRecord } = deps

  app.get('/api/departments', (_, res) => {
    res.json(buildControlPlaneSnapshot().departments)
  })

  app.get('/api/departments/:id', (req, res) => {
    const department = buildControlPlaneSnapshot().departments.find((item) => item.id === String(req.params.id || '').toLowerCase())
    if (!department) return res.status(404).json({ error: 'Department not found' })
    res.json(department)
  })

  app.get('/api/agents', (_, res) => res.json(getAgentRegistryView()))

  app.get('/api/agents/:id', (req, res) => {
    const agent = getAgentRegistryRecord(req.params.id)
    if (!agent) return res.status(404).json({ error: 'Agent not found' })
    res.json(agent)
  })
}
