import assert from 'assert/strict'

const BASE = 'http://127.0.0.1:4174'
const REQUIRED_IDS = ['nettie', 'van', 'perry', 'dana', 'torina', 'hermes']
const REQUIRED_FIELDS = [
  'id',
  'displayName',
  'department',
  'roleTitle',
  'domainOwnership',
  'permissions',
  'escalationRules',
  'activeQueueCount',
  'status',
  'executorRoute',
  'fallbackRoute',
  'lastSeenAt',
]

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

function assertAgentShape(agent) {
  for (const field of REQUIRED_FIELDS) {
    assert.ok(Object.prototype.hasOwnProperty.call(agent, field), `agent record missing ${field}`)
  }
  assert.equal(typeof agent.id, 'string', 'agent.id should be string')
  assert.equal(typeof agent.displayName, 'string', 'agent.displayName should be string')
  assert.equal(typeof agent.department, 'string', 'agent.department should be string')
  assert.equal(typeof agent.roleTitle, 'string', 'agent.roleTitle should be string')
  assert.equal(typeof agent.domainOwnership, 'string', 'agent.domainOwnership should be string')
  assert.ok(Array.isArray(agent.permissions), 'agent.permissions should be array')
  assert.ok(Array.isArray(agent.escalationRules), 'agent.escalationRules should be array')
  assert.equal(typeof agent.activeQueueCount, 'number', 'agent.activeQueueCount should be number')
  assert.equal(typeof agent.status, 'string', 'agent.status should be string')
  assert.ok(agent.executorRoute && typeof agent.executorRoute === 'object', 'agent.executorRoute should be object')
  assert.ok(agent.fallbackRoute && typeof agent.fallbackRoute === 'object', 'agent.fallbackRoute should be object')
  assert.ok(agent.lastSeenAt === null || typeof agent.lastSeenAt === 'string', 'agent.lastSeenAt should be string|null')
}

async function testAgentsCollection() {
  const { res, data } = await request('/api/agents')
  assert.equal(res.status, 200, '/api/agents should return 200')
  assert.ok(Array.isArray(data), '/api/agents should return an array')
  for (const id of REQUIRED_IDS) {
    const found = data.find((agent) => agent.id === id)
    assert.ok(found, `missing core agent ${id}`)
    assertAgentShape(found)
  }
}

async function testAgentDetail() {
  const { res, data } = await request('/api/agents/nettie')
  assert.equal(res.status, 200, '/api/agents/:id should return 200 for core agent')
  assert.equal(data.id, 'nettie', 'detail route should return requested agent')
  assertAgentShape(data)
}

async function testAvailabilityPrompt() {
  const { res, data } = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'who is available and what are they responsible for?',
      sender: 'Patrick',
      channel: 'mission-control',
    }),
  })
  assert.equal(res.status, 201, 'availability prompt should return 201')
  const replyText = String(data?.reply?.text || '')
  assert.match(replyText, /Nettie/i, 'availability prompt should mention Nettie')
  assert.match(replyText, /Van/i, 'availability prompt should mention Van')
  assert.match(replyText, /responsible|domain|owns|available/i, 'availability prompt should summarize availability and ownership')
}

async function main() {
  const { res, data } = await request('/api/health')
  assert.equal(res.status, 200, 'health should return 200')
  assert.equal(data.ok, true, 'health.ok should be true')
  await testAgentsCollection()
  await testAgentDetail()
  await testAvailabilityPrompt()
  console.log('Phase B agent registry tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
