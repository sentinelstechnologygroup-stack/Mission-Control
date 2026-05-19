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

const unknownReply = await postCommand('tell me something weird about the machine spirit')
assert.equal(unknownReply.intent, 'unknown')
assert.ok(unknownReply.replyMarkdown.includes('NEXT:'), 'unknown reply missing fallback guidance')

console.log('Nettie command response engine tests passed')
