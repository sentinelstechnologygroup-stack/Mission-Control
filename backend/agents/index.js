export function registerAgentsRoutes(app, deps) {
  const { state, buildControlPlaneSnapshot } = deps

  app.get('/api/departments', (_, res) => {
    res.json(buildControlPlaneSnapshot().departments)
  })

  app.get('/api/departments/:id', (req, res) => {
    const department = buildControlPlaneSnapshot().departments.find((item) => item.id === String(req.params.id || '').toLowerCase())
    if (!department) return res.status(404).json({ error: 'Department not found' })
    res.json(department)
  })

  app.get('/api/agents', (_, res) => res.json(state.agents))
}
