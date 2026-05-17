import assert from 'assert/strict'

const BASE = 'http://127.0.0.1:4174'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { res, data }
}

async function main() {
  const [
    observability,
    queues,
    safeQueue,
    dupQueue,
    archiveCandidates,
    archiveDryRun,
    topology,
  ] = await Promise.all([
    request('/api/ops/observability'),
    request('/api/reconciliation/queues'),
    request('/api/reconciliation/queues/safe_to_resume'),
    request('/api/reconciliation/queues/duplicate_resolution'),
    request('/api/archive/candidates'),
    request('/api/archive/compact-dry-run', { method: 'POST' }),
    request('/api/queue/topology'),
  ])

  assert.equal(observability.res.status, 200)
  assert.equal(queues.res.status, 200)
  assert.equal(safeQueue.res.status, 200)
  assert.equal(dupQueue.res.status, 200)
  assert.equal(archiveCandidates.res.status, 200)
  assert.equal(archiveDryRun.res.status, 200)
  assert.equal(topology.res.status, 200)

  for (const field of [
    'mcOnline',
    'bridgeOnline',
    'executorState',
    'localAIAvailability',
    'deepWorkState',
    'localWorkState',
    'reconciliationDebtScore',
    'workCounts',
    'dependencyHealth',
    'lockConflicts',
    'memoryPressure',
    'restartState',
    'lastSuccessfulWorkerHeartbeat',
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(observability.data, field), `observability missing ${field}`)
  }

  assert.ok(Array.isArray(queues.data.queues.safe_to_resume.items))
  assert.ok(Array.isArray(queues.data.queues.duplicate_resolution.items))
  assert.ok(Array.isArray(queues.data.queues.stale_review.items))
  assert.ok(Array.isArray(queues.data.queues.orphan_dependency.items))
  assert.ok(Array.isArray(queues.data.queues.manual_only.items))
  assert.ok(Array.isArray(queues.data.queues.blocked_provider.items))
  assert.ok(Array.isArray(queues.data.queues.needs_patrick.items))
  assert.ok(Array.isArray(queues.data.queues.needs_perry.items))
  assert.ok(Array.isArray(queues.data.queues.already_running_elsewhere.items))
  assert.equal(typeof queues.data.reconciliationDebtScore, 'number')
  assert.ok(dupQueue.data.type === 'duplicate_resolution')

  assert.ok(Array.isArray(archiveCandidates.data.candidates))
  assert.equal(archiveDryRun.data.mode, 'dry_run')
  assert.ok(Array.isArray(archiveDryRun.data.candidates))
  assert.equal(typeof archiveDryRun.data.summary.totalCandidates, 'number')

  assert.ok(topology.data.graph)
  assert.ok(Array.isArray(topology.data.graph.nodes))
  assert.ok(Array.isArray(topology.data.graph.edges))
  assert.ok(Array.isArray(topology.data.blockedChains))
  assert.ok(Array.isArray(topology.data.orphanChains))
  assert.ok(Array.isArray(topology.data.unlockReadyChains))
  assert.ok(Array.isArray(topology.data.duplicateClusters))
  assert.ok(Array.isArray(topology.data.staleClusters))
  assert.ok(Array.isArray(topology.data.ownerGroups))

  console.log('Next runtime slice tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
