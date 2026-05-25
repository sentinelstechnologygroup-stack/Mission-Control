import assert from 'assert/strict'

const base = 'http://127.0.0.1:4174'

async function postCommand(message) {
  const response = await fetch(`${base}/api/nettie/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, operator: 'Patrick', context: { route: '/nettie' } }),
  })
  const text = await response.text()
  const data = JSON.parse(text)
  assert.equal(response.status, 200, `${message} should return 200`)
  assert.ok(!text.includes('sk-'), `${message} leaked a secret-looking token`)
  assert.ok(data.replyMarkdown && String(data.replyMarkdown).trim().length > 0, `${message} returned empty replyMarkdown`)
  assert.ok(Array.isArray(data.queriedSources), `${message} missing queriedSources array`)
  return data
}

const statusReply = await postCommand('status')
assert.equal(statusReply.intent, 'status')
assert.ok(statusReply.replyMarkdown.includes('STATUS:'), 'status reply missing STATUS heading')

const blockedReply = await postCommand('what is blocked')
assert.equal(blockedReply.intent, 'blocked_jobs')
assert.ok(blockedReply.replyMarkdown.includes('RISKS / NOTES:'), 'blocked reply missing RISKS / NOTES')

const staleReportsReply = await postCommand('what reports are stale')
assert.equal(staleReportsReply.intent, 'report_status')

const routeReply = await postCommand('have Van investigate queue drift')
assert.ok(['route_to_agent', 'create_task'].includes(routeReply.intent), 'routing reply intent mismatch')
assert.ok(Array.isArray(routeReply.createdJobs), 'routing reply missing createdJobs')
assert.ok(routeReply.createdJobs.length >= 1, 'routing reply should create at least one job')

const deployReply = await postCommand('deploy production')
assert.equal(deployReply.intent, 'deployment_request')
assert.equal(deployReply.requiresApproval, true)
assert.ok(deployReply.approvalReason, 'deploy production should explain approval requirement')

const testReply = await postCommand('test')
assert.equal(testReply.intent, 'unknown')
assert.ok(!testReply.replyMarkdown.includes('STATUS:'), 'test reply should not use triage formatting')
assert.ok(!testReply.replyMarkdown.includes('Fallback triage'), 'test reply should not mention fallback triage')
assert.match(testReply.replyMarkdown, /Nettie|conversational|route a task|what you want/i, 'test reply should stay conversational')

const identityReply = await postCommand('who are you?')
assert.equal(identityReply.intent, 'general_chat')
assert.match(identityReply.replyMarkdown, /I’m Nettie|I am Nettie|Nettie/i, 'identity reply should identify Nettie')

const clarifyReply = await postCommand('fix it')
assert.equal(clarifyReply.intent, 'clarification_request')
assert.match(clarifyReply.replyMarkdown, /Tell me the route|exact target|what you want changed/i, 'clarification reply should ask for a precise target')
assert.ok(!Array.isArray(clarifyReply.createdJobs) || clarifyReply.createdJobs.length === 0, 'clarification should not create jobs')

const routeVanReply = await postCommand('Have Van investigate queue drift.')
assert.ok(['route_to_agent', 'create_task'].includes(routeVanReply.intent), 'routing reply intent mismatch')
assert.ok(Array.isArray(routeVanReply.createdJobs), 'routing reply missing createdJobs')
assert.ok(routeVanReply.createdJobs.length >= 1, 'routing reply should create at least one job')
assert.equal(routeVanReply.createdJobs[0].owner, 'Van')

console.log('Nettie command response engine tests passed')
