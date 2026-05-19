import assert from 'assert/strict'

const base = 'http://127.0.0.1:4174'

async function getJson(path) {
  const response = await fetch(`${base}${path}`)
  const text = await response.text()
  const data = JSON.parse(text)
  assert.equal(response.status, 200, `${path} should return 200`)
  assert.ok(!text.includes('sk-'), `${path} leaked a secret-looking token`)
  return data
}

const reconciliation = await getJson('/api/runtime/reconciliation')
for (const key of ['updatedAt', 'truthStatus', 'overallStatus', 'sourceCounts', 'mismatches', 'duplicateJobs', 'orphanJobs', 'staleJobs', 'lockConflicts', 'impossibleStates', 'recommendedActions', 'safeAutoFixesAvailable', 'requiresHumanApproval']) {
  assert.ok(Object.prototype.hasOwnProperty.call(reconciliation, key), `missing reconciliation key ${key}`)
}

const locks = await getJson('/api/runtime/locks')
for (const key of ['updatedAt', 'truthStatus', 'activeLocks', 'lockConflicts', 'staleLocks', 'affectedJobs', 'owners', 'recommendedActions']) {
  assert.ok(Object.prototype.hasOwnProperty.call(locks, key), `missing locks key ${key}`)
}

const triage = await getJson('/api/triage/summary')
for (const key of ['updatedAt', 'truthStatus', 'runtimeHealth', 'reconciliation', 'queuePressure', 'blockerBreakdown', 'lockGovernance', 'staleJobs', 'staleReports', 'orphanJobs', 'topRisks', 'nextActions', 'activeIncidents', 'cooldownStatus', 'artifactFreshness', 'activityFeed', 'operatorRecommendations']) {
  assert.ok(Object.prototype.hasOwnProperty.call(triage, key), `missing triage key ${key}`)
}
assert.ok(Array.isArray(triage.reconciliation.mismatches), 'triage reconciliation mismatches should be an array')

const blocked = await getJson('/api/jobs/blocked')
const lockConflictJob = blocked.find((job) => /lock conflict job/i.test(String(job.task || job.title || '')))
if (lockConflictJob) {
  assert.equal(lockConflictJob.blockerClass, 'BLOCKED_LOCK_CONFLICT', 'lock conflict job should classify as BLOCKED_LOCK_CONFLICT')
}

console.log('Runtime reconciliation authority tests passed')
