function normalizeDepartmentId(value = '') {
  const id = String(value || '').toLowerCase().trim()
  const aliases = {
    command: 'nettie',
    executive: 'nettie',
    netty: 'nettie',
    technology: 'van',
    tech: 'van',
    security: 'perry',
    media: 'torina',
    writing: 'torina',
    finance: 'dana',
    admin: 'icky',
    administration: 'icky',
    opportunity: 'funboy',
    research: 'rab',
    rnd: 'rab',
    'r&d': 'rab',
  }
  return aliases[id] || id
}

export function registerAgentsRoutes(app, deps) {
  const { buildControlPlaneSnapshot, getAgentRegistryView, getAgentRegistryRecord } = deps

  app.get('/api/departments', (_, res) => {
    res.json(buildControlPlaneSnapshot().departments)
  })

  app.get('/api/departments/:id', (req, res, next) => {
    const id = normalizeDepartmentId(req.params.id)
    if (id === 'workflows') return next()
    const department = buildControlPlaneSnapshot().departments.find((item) => item.id === id)
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
