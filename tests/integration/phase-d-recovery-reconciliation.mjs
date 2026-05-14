import assert from 'assert/strict'
import fs from 'fs'
import {
  buildActiveWorkView,
  buildRecoveryReconciliationReport,
} from '../../lib/recoveryReconciliation.js'

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

function testActiveWorkView() {
  const view = buildActiveWorkView({
    active: [],
    running: [{ id: 'job_run', task: 'run', status: 'running', updatedAt: '2026-05-15T10:00:00.000Z' }],
    queued: [{ id: 'job_q', task: 'queue', status: 'queued', updatedAt: '2026-05-15T09:00:00.000Z' }],
    paused: [{ id: 'job_p', task: 'pause', status: 'paused', updatedAt: '2026-05-15T08:00:00.000Z' }],
    blocked: [{ id: 'job_b', task: 'block', status: 'blocked', updatedAt: '2026-05-15T07:00:00.000Z' }],
    completedRecent: [],
  })
  assert.equal(view.count, 4)
  assert.equal(view.activeSubsetCount, 0)
  assert.equal(view.buckets.running, 1)
  assert.equal(view.buckets.queued, 1)
  assert.equal(view.buckets.paused, 1)
  assert.equal(view.buckets.blocked, 1)
}

function testReconciliationReport() {
  const report = buildRecoveryReconciliationReport({
    ledgerJobs: [
      {
        id: 'job_safe',
        task: 'Low-risk local summary draft',
        owner: 'Nettie',
        status: 'queued',
        routeStatus: 'queued',
        updatedAt: '2026-05-15T10:00:00.000Z',
        inputPayload: { projectPath: '/tmp/project' },
      },
      {
        id: 'job_blocked',
        task: 'Build the production deployment pipeline',
        owner: 'Van',
        status: 'paused',
        routeStatus: 'paused_provider_blocked',
        updatedAt: '2026-05-15T11:00:00.000Z',
        providerOutage: true,
        inputPayload: { projectPath: '/tmp/project' },
      },
    ],
    registry: { active: [], running: [], queued: [], paused: [], blocked: [], completedRecent: [] },
    runtimeJobs: [],
    workers: [],
    governanceState: { cooldown: { active: true } },
    now: '2026-05-15T12:00:00.000Z',
  })

  assert.equal(report.reconciliationRequired, true)
  assert.equal(report.autoResumeEnabled, false)
  const safe = report.jobs.find((job) => job.jobId === 'job_safe')
  const blocked = report.jobs.find((job) => job.jobId === 'job_blocked')
  assert(safe)
  assert(blocked)
  assert.equal(safe.recoveryClassification, 'safe_to_resume')
  assert.equal(safe.autoResumeAllowed, false)
  assert.equal(safe.autoResumeReason, 'reconciliation_required')
  assert.equal(blocked.recoveryClassification, 'blocked_provider')
  assert.equal(blocked.autoResumeAllowed, false)
}

async function testRecoveryEndpoint() {
  const { res, data } = await request('/api/runtime/recovery', {
    headers: {
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
  })
  assert.equal(res.status, 200)
  assert.equal(data.reconciliationRequired, true)
  assert.equal(data.autoResumeEnabled, false)
  assert.ok(Array.isArray(data.jobs))
  assert.ok(data.jobs.length > 0)
  for (const field of ['jobId', 'title', 'owner', 'currentStatus', 'sourceOfTruth', 'lastUpdated', 'recoveryClassification', 'recommendedAction', 'autoResumeAllowed']) {
    assert.ok(Object.prototype.hasOwnProperty.call(data.jobs[0], field), `recovery report missing ${field}`)
  }
}

async function testActiveWorkEndpoint() {
  const [{ data: active }, { data: registry }] = await Promise.all([
    request('/api/active-work'),
    request('/api/work/registry'),
  ])
  assert.equal(typeof active.count, 'number')
  assert.ok(active.count > 0, 'active-work should report open work, not only registry.active')
  assert.ok(Array.isArray(active.jobs))
  assert.ok(active.buckets)
  assert.equal(active.buckets.running, registry.running.length)
  assert.equal(active.buckets.queued, registry.queued.length)
  assert.equal(active.buckets.paused, registry.paused.length)
  assert.equal(active.buckets.blocked, registry.blocked.length)
}

async function testExecutorBudgetEndpoint() {
  const { res, data } = await request('/api/executors/budget', {
    headers: {
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
  })
  assert.equal(res.status, 200)
  assert.ok(data.providerState)
  assert.ok(data.budget)
}

async function main() {
  testActiveWorkView()
  testReconciliationReport()
  await testRecoveryEndpoint()
  await testActiveWorkEndpoint()
  await testExecutorBudgetEndpoint()
  console.log('Phase D recovery reconciliation tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
