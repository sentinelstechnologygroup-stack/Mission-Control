import assert from 'assert/strict'
import {
  buildDailyRollupPolicy,
  buildQueuePriorities,
  buildTopNextActions,
} from '../../lib/queuePrioritization.js'

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

function testLocalAIRouting() {
  const queue = buildQueuePriorities({
    registry: {
      active: [],
      running: [],
      queued: [{
        id: 'job_local',
        task: 'Draft daily status summary and queue triage report',
        owner: 'Nettie',
        status: 'queued',
        routeStatus: 'queued',
        updatedAt: '2026-05-15T10:00:00.000Z',
      }],
      paused: [],
      blocked: [],
      completedRecent: [],
    },
    recoveryReport: { reconciliationRequired: false, jobs: [] },
    claudeValidated: false,
    now: '2026-05-15T10:05:00.000Z',
  })
  const item = queue.priorities[0]
  assert.equal(item.localAIDraftEligible, true)
  assert.equal(item.selectedExecutor, 'local_ai')
  assert.equal(item.executorPolicy, 'draft_only')
  assert.equal(item.localAIFinalAllowed, false)
}

function testTechnicalBuildRouting() {
  const queue = buildQueuePriorities({
    registry: {
      active: [],
      running: [],
      queued: [{
        id: 'job_build',
        task: 'Build the website deployment pipeline',
        owner: 'Van',
        status: 'queued',
        routeStatus: 'queued',
        updatedAt: '2026-05-15T10:00:00.000Z',
      }],
      paused: [],
      blocked: [],
      completedRecent: [],
    },
    recoveryReport: { reconciliationRequired: false, jobs: [] },
    claudeValidated: false,
    now: '2026-05-15T10:05:00.000Z',
  })
  const item = queue.priorities[0]
  assert.equal(item.selectedExecutor, 'gpt_codex')
  assert.equal(item.departmentHead, 'Van')
}

function testReviewChainAddsPerry() {
  const queue = buildQueuePriorities({
    registry: {
      active: [],
      running: [],
      queued: [{
        id: 'job_deploy',
        task: 'Prepare deployment and client-facing release report',
        owner: 'Van',
        status: 'queued',
        routeStatus: 'queued',
        updatedAt: '2026-05-15T10:00:00.000Z',
      }],
      paused: [],
      blocked: [],
      completedRecent: [],
    },
    recoveryReport: { reconciliationRequired: false, jobs: [] },
    claudeValidated: false,
    now: '2026-05-15T10:05:00.000Z',
  })
  const stages = queue.priorities[0].reviewChain.map((entry) => entry.stage)
  assert.deepEqual(stages, [
    'agent_employee',
    'department_head',
    'perry_review',
    'nettie_final_assembly',
    'patrick_delivery',
  ])
}

function testDailyRollupPolicy() {
  const policy = buildDailyRollupPolicy()
  assert.equal(policy.scheduleLocalTime, '23:00')
  assert.equal(policy.draftExecutor, 'local_ai')
  assert.equal(policy.draftLabelWhenFallback, 'local-draft')
  assert.ok(policy.reviewChain.includes('nettie_final_assembly'))
}

function testTopNextActions() {
  const queue = buildQueuePriorities({
    registry: {
      active: [],
      running: [],
      queued: [
        { id: 'job_a', task: 'Draft queue triage summary', owner: 'Nettie', status: 'queued', routeStatus: 'queued', updatedAt: '2026-05-15T10:00:00.000Z' },
        { id: 'job_b', task: 'Build new app release', owner: 'Van', status: 'queued', routeStatus: 'queued', updatedAt: '2026-05-15T10:01:00.000Z' },
      ],
      paused: [],
      blocked: [{ id: 'job_c', task: 'Blocked deployment', owner: 'Van', status: 'blocked', routeStatus: 'blocked', updatedAt: '2026-05-15T10:02:00.000Z' }],
      completedRecent: [],
    },
    recoveryReport: { reconciliationRequired: false, jobs: [] },
    claudeValidated: false,
    now: '2026-05-15T10:05:00.000Z',
  })
  const next = buildTopNextActions(queue.priorities, { limit: 10 })
  assert.equal(next.count, 2)
  assert.equal(next.nextActions.some((item) => item.jobId === 'job_c'), false)
}

async function testLiveQueueEndpoints() {
  const [{ res: prioritiesRes, data: priorities }, { res: nextRes, data: next }] = await Promise.all([
    request('/api/queue/priorities'),
    request('/api/queue/next-actions'),
  ])
  assert.equal(prioritiesRes.status, 200)
  assert.equal(nextRes.status, 200)
  assert.ok(Array.isArray(priorities.priorities))
  assert.ok(priorities.dailyRollupPolicy)
  assert.equal(priorities.dailyRollupPolicy.draftExecutor, 'local_ai')
  if (priorities.priorities.length) {
    assert.ok(Array.isArray(priorities.priorities[0].reviewChain))
    assert.ok(Object.prototype.hasOwnProperty.call(priorities.priorities[0], 'selectedExecutor'))
    assert.ok(Object.prototype.hasOwnProperty.call(priorities.priorities[0], 'localAIDraftEligible'))
  }
  assert.ok(Array.isArray(next.nextActions))
  assert.ok(next.count <= 10)
}

async function main() {
  testLocalAIRouting()
  testTechnicalBuildRouting()
  testReviewChainAddsPerry()
  testDailyRollupPolicy()
  testTopNextActions()
  await testLiveQueueEndpoints()
  console.log('Factory queue prioritization tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
