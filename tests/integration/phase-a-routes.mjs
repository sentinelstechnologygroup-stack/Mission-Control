import fs from 'fs'
import assert from 'assert/strict'

function loadEnvToken() {
  const text = fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  const match = text.match(/^MC_BRIDGE_TOKEN=(.+)$/m)
  assert(match, 'MC_BRIDGE_TOKEN not found in .env')
  return match[1].trim().replace(/^['\"]|['\"]$/g, '')
}

const BASE = 'http://127.0.0.1:4174'
const BRIDGE_TOKEN = loadEnvToken()

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

async function getExecutorStatus() {
  const { res, data } = await request('/api/executor/status', {
    headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
  })
  assert.equal(res.status, 200, 'executor status should return 200')
  assert.equal(data.bridgeConnected, true, 'bridgeConnected should be true')
  assert.ok(typeof data.executorReady === 'boolean', 'executorReady should be boolean')
  assert.ok(typeof data.executorCoolingDown === 'boolean', 'executorCoolingDown should be boolean')
  return data
}

async function pollReply(replyId, { timeoutMs = 90000 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const { res, data } = await request('/api/chat/history')
    assert.equal(res.status, 200, 'chat history should return 200')
    const msg = Array.isArray(data) ? data.find((entry) => entry.id === replyId) : null
    if (msg && msg.kind !== 'pending') return msg
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`reply ${replyId} did not resolve before timeout`)
}

async function testFreeformConversation() {
  const { res, data } = await request('/api/nettie/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
    body: JSON.stringify({
      message: 'Nettie — summarize the current Mission Control architecture in 5 bullet points.',
      sender: 'Patrick',
      channel: 'mission-control',
    }),
  })
  assert.equal(res.status, 201, 'freeform Nettie bridge message should return 201')
  assert.equal(data.liveConversation, true, 'freeform Nettie bridge message should use liveConversation path')
  assert.equal(data.reply?.kind, 'pending', 'freeform reply should start pending')
  const finalReply = await pollReply(data.reply.id)
  const text = String(finalReply.text || '')
  assert.ok(!/Internal analysis/i.test(text), 'freeform reply must not fall into internal analysis')
  assert.ok(!/No job ID found in message/i.test(text), 'freeform reply must not fall into job-id parser failure')
  assert.ok(['nettie_async', 'status', 'ack', 'outage'].includes(finalReply.kind), 'resolved reply kind must be operator-visible')
  return finalReply
}

async function testExecutorStatusPrompt() {
  const { res, data } = await request('/api/nettie/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
    body: JSON.stringify({
      message: 'Nettie — confirm live response loop. Tell me your current executor route and status.',
      sender: 'Patrick',
      channel: 'mission-control',
    }),
  })
  assert.equal(res.status, 201, 'executor status prompt should return 201')
  assert.equal(data.intent, 'executor_status', 'executor status prompt should route to executor_status intent')
  assert.match(String(data?.reply?.text || ''), /Bridge: connected|Primary route: codex|Fallback:/i, 'executor status prompt should return truthful runtime status')
}

async function testQueuedJobsInspection() {
  const { res, data } = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'show queued jobs', sender: 'Patrick', channel: 'mission-control' }),
  })
  assert.equal(res.status, 201, 'queued jobs inspection should return 201')
  const text = String(data?.reply?.text || '')
  assert.match(text, /Queued jobs|Queued \(|job registry|Global Inspection/i, 'queued jobs prompt should return queue inspection output')
}

function assertFallbackRouting(executorStatus, finalReply) {
  assert.match(String(finalReply.text || ''), /Nettie:/i, 'freeform conversation should still return an operator reply')
  if (executorStatus.executorCoolingDown && executorStatus.fallback?.autoRoutable) {
    assert.equal(finalReply.executorRoute, 'fallback-cooldown', 'cooldown mode should route freeform reply through Hermes fallback')
  }
}

async function main() {
  const { res, data } = await request('/api/health')
  assert.equal(res.status, 200, 'health should return 200')
  assert.equal(data.ok, true, 'health.ok should be true')

  const executorStatus = await getExecutorStatus()
  const freeformReply = await testFreeformConversation()
  await testExecutorStatusPrompt()
  await testQueuedJobsInspection()
  assertFallbackRouting(executorStatus, freeformReply)

  console.log('Phase A integration tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
