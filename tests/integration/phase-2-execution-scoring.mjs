import assert from 'assert/strict'
import fs from 'fs'
import {
  buildDependencyGraph,
} from '../../lib/jobDependencies.js'
import {
  buildQueuePriorities,
  buildTopNextActions,
} from '../../lib/queuePrioritization.js'

const BASE = 'http://127.0.0.1:4174'

function loadEnvToken() {
  if (process.env.MC_BRIDGE_TOKEN) return process.env.MC_BRIDGE_TOKEN
  const text = fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  const match = text.match(/^MC_BRIDGE_TOKEN=(.+)$/m)
  assert(match, 'MC_BRIDGE_TOKEN not found in .env')
  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

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

function buildSampleQueue() {
  const registry = {
    active: [],
    running: [],
    queued: [
      {
        id: 'job_old_safe',
        task: 'Draft low risk queue status summary',
        owner: 'Nettie',
        status: 'queued',
        routeStatus: 'queued',
        createdAt: '2026-05-10T10:00:00.000Z',
        updatedAt: '2026-05-10T10:00:00.000Z',
      },
      {
        id: 'job_dup_a',
        task: 'Build shared release pipeline',
        owner: 'Van',
        sourceType: 'mission-control',
        status: 'queued',
        routeStatus: 'queued',
        createdAt: '2026-05-15T09:00:00.000Z',
        updatedAt: '2026-05-15T09:00:00.000Z',
      },
      {
        id: 'job_dup_b',
        task: 'Build shared release pipeline',
        owner: 'Van',
        sourceType: 'mission-control',
        status: 'queued',
        routeStatus: 'queued',
        createdAt: '2026-05-15T10:00:00.000Z',
        updatedAt: '2026-05-15T10:30:00.000Z',
      },
      {
        id: 'job_orphan',
        task: 'Deploy app after missing prerequisite',
        owner: 'Van',
        status: 'queued',
        routeStatus: 'queued',
        dependsOn: ['job_missing'],
        createdAt: '2026-05-15T10:00:00.000Z',
        updatedAt: '2026-05-15T10:00:00.000Z',
      },
      {
        id: 'job_high_risk',
        task: 'Approve production deployment and security changes',
        owner: 'Van',
        status: 'queued',
        routeStatus: 'queued',
        createdAt: '2026-05-15T10:00:00.000Z',
        updatedAt: '2026-05-15T10:00:00.000Z',
      },
    ],
    paused: [],
    blocked: [],
    completedRecent: [],
  }
  const dependencyGraph = buildDependencyGraph({ jobs: registry.queued, now: '2026-05-16T12:00:00.000Z' })
  const recoveryReport = {
    reconciliationRequired: true,
    jobs: [
      { jobId: 'job_dup_a', recoveryClassification: 'duplicate', autoResumeAllowed: false, autoResumeReason: 'duplicate_open_job' },
      { jobId: 'job_dup_b', recoveryClassification: 'duplicate', autoResumeAllowed: false, autoResumeReason: 'duplicate_open_job' },
      { jobId: 'job_old_safe', recoveryClassification: 'safe_to_resume', autoResumeAllowed: true, autoResumeReason: null },
    ],
  }
  return buildQueuePriorities({
    registry,
    recoveryReport,
    dependencyGraph,
    claudeValidated: false,
    now: '2026-05-16T12:00:00.000Z',
  })
}

function testDuplicateRiskAndNoPromotion() {
  const queue = buildSampleQueue()
  const dupA = queue.priorities.find((job) => job.jobId === 'job_dup_a')
  const dupB = queue.priorities.find((job) => job.jobId === 'job_dup_b')
  assert(dupA)
  assert(dupB)
  assert.equal(dupA.duplicateRisk, 'high')
  assert.equal(dupB.duplicateRisk, 'high')
  assert.equal(dupA.executable, false)
  assert.equal(dupB.executable, false)
  assert.equal(dupA.blockedReason, 'duplicate_candidate')
}

function testOrphanDependencyBlocked() {
  const queue = buildSampleQueue()
  const orphan = queue.priorities.find((job) => job.jobId === 'job_orphan')
  assert(orphan)
  assert.equal(orphan.dependencyReadiness, 'orphan_dependency')
  assert.equal(orphan.executable, false)
  assert.equal(orphan.blockedReason, 'orphan_dependency')
}

function testHighRiskNotLocalAI() {
  const queue = buildSampleQueue()
  const risky = queue.priorities.find((job) => job.jobId === 'job_high_risk')
  assert(risky)
  assert.equal(risky.localModelAllowed, false)
  assert.notEqual(risky.selectedExecutor, 'local_ai')
  assert.ok(Array.isArray(risky.requiredReviewChain))
}

function testStarvationRiskElevatesSafeOldWork() {
  const queue = buildSampleQueue()
  const oldSafe = queue.priorities.find((job) => job.jobId === 'job_old_safe')
  assert(oldSafe)
  assert.ok(['medium', 'high'].includes(oldSafe.starvationRisk))
  const next = buildTopNextActions(queue.priorities, { limit: 10 })
  assert.equal(next.nextActions[0].jobId, 'job_old_safe')
  assert.match(String(next.nextActions[0].whyRecommended || ''), /starvation|safe|local|reconciliation/i)
}

async function testLiveRiskEndpoints() {
  const [{ res: debtRes, data: debt }, { res: forecastRes, data: forecast }, { res: restartRes, data: restart }] = await Promise.all([
    request('/api/recovery/debt'),
    request('/api/executors/forecast', { headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` } }),
    request('/api/runtime/restart-state'),
  ])
  assert.equal(debtRes.status, 200)
  assert.equal(forecastRes.status, 200)
  assert.equal(restartRes.status, 200)
  assert.equal(typeof debt.reconciliationDebtScore, 'number')
  assert.ok(Array.isArray(debt.topBlockers))
  assert.ok(Array.isArray(forecast.providers))
  assert.ok(Object.prototype.hasOwnProperty.call(forecast.providers[0] || {}, 'retryAllowedAt'))
  assert.ok(Object.prototype.hasOwnProperty.call(forecast.providers[0] || {}, 'resetsInSeconds'))
  assert.ok(Object.prototype.hasOwnProperty.call(restart, 'restartEpoch'))
  assert.ok(Object.prototype.hasOwnProperty.call(restart, 'sessionId'))
  assert.ok(Object.prototype.hasOwnProperty.call(restart, 'memoryPressure'))
}

async function testLockEndpointAndManualRunConflict() {
  const uniqueTitle = `Lock conflict job ${Date.now()}`
  const created = await request('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: uniqueTitle, owner: 'Van', description: 'test lock flow' }),
  })
  assert.equal(created.res.status, 201)
  const jobId = created.data.id

  const locked = await request(`/api/jobs/${jobId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lockOwner: 'window_a', lockSession: 'session-a', lockReason: 'manual execution', ttlSeconds: 300 }),
  })
  assert.equal(locked.res.status, 200)

  const blockedRun = await request(`/api/jobs/${jobId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-mc-session-id': 'session-b' },
  })
  assert.equal(blockedRun.res.status, 409)
  assert.equal(blockedRun.data.error, 'job_locked')
}

async function main() {
  testDuplicateRiskAndNoPromotion()
  testOrphanDependencyBlocked()
  testHighRiskNotLocalAI()
  testStarvationRiskElevatesSafeOldWork()
  await testLiveRiskEndpoints()
  await testLockEndpointAndManualRunConflict()
  console.log('Phase 2 execution scoring tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
