import assert from 'assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  defaultClaudeCliAssessment,
  defaultGovernanceState,
  evaluateHermesGovernance,
  classifyJobTokenCost,
  applyCooldownPauseToJobs,
  recoverPausedProviderBlockedJobs,
  recoverStaleRunningJobs,
  reconcileRecurringRecovery,
  markRecurringRunCompletedLate,
} from '../../lib/runtimeGovernance.js'

const BASE = 'http://127.0.0.1:4174'

function loadEnvToken() {
  if (process.env.MC_BRIDGE_TOKEN) return process.env.MC_BRIDGE_TOKEN
  const text = fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  const match = text.match(/^MC_BRIDGE_TOKEN=(.*)$/m)
  assert(match, 'MC_BRIDGE_TOKEN not found in .env')
  return match[1].trim().replace(/^['\"]|['\"]$/g, '')
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

function testClaudeAssessment() {
  const report = defaultClaudeCliAssessment()
  assert.equal(report.route, 'claude_cli')
  assert.equal(report.reliable, false)
  assert.equal(report.status, 'manual_only')
  assert.match(report.summary, /manual break-glass only|manual/i)
}

function testHermesGovernance() {
  const blocked = evaluateHermesGovernance({
    mcRuntimeOnline: false,
    breakGlassMode: false,
    hasApprovedOperatorCommand: false,
    hasJobRecord: false,
    actionType: 'project_execution',
    task: 'build project',
  })
  assert.equal(blocked.allowed, false)
  assert.match(blocked.reason, /MC offline/i)

  const allowed = evaluateHermesGovernance({
    mcRuntimeOnline: false,
    breakGlassMode: true,
    hasApprovedOperatorCommand: false,
    hasJobRecord: false,
    actionType: 'recovery_diagnostic',
    task: 'recovery diagnostics only',
  })
  assert.equal(allowed.allowed, true)
  assert.equal(allowed.break_glass_mode, true)
}

function testCooldownPauseAndRecovery() {
  const governance = defaultGovernanceState({ updatedAt: '2026-05-15T12:00:00.000Z' })
  governance.cooldown.active = true
  governance.cooldown.provider = 'openai'
  governance.cooldown.reliableFallbackAvailable = false
  governance.cooldown.resetEta = '2026-05-15T14:00:00.000Z'

  const jobs = [{
    id: 'job_heavy',
    task: 'Build the new autonomous deployment pipeline',
    status: 'queued',
    routeStatus: 'queued',
    recurring: { enabled: false },
  }]
  const paused = applyCooldownPauseToJobs(jobs, governance, { now: '2026-05-15T12:05:00.000Z' })
  assert.equal(paused.jobs[0].status, 'paused')
  assert.equal(paused.jobs[0].routeStatus, 'paused_provider_blocked')
  assert.equal(paused.jobs[0].tokenCostClass, 'high')
  assert.deepEqual(paused.pausedJobIds, ['job_heavy'])

  governance.cooldown.active = false
  const resumed = recoverPausedProviderBlockedJobs(paused.jobs, governance, { providerHealthy: true, now: '2026-05-15T14:01:00.000Z' })
  assert.equal(resumed.jobs[0].status, 'queued')
  assert.equal(resumed.jobs[0].routeStatus, 'resumed_after_cooldown')
  assert.deepEqual(resumed.resumedJobIds, ['job_heavy'])
}

function testStaleWorkerRecovery() {
  const stale = recoverStaleRunningJobs([
    {
      id: 'job_stale',
      status: 'running',
      routeStatus: 'running',
      heartbeatAt: '2026-05-15T10:00:00.000Z',
      updatedAt: '2026-05-15T10:00:00.000Z',
    },
  ], { now: '2026-05-15T12:30:00.000Z', timeoutMs: 60 * 60 * 1000 })
  assert.equal(stale.jobs[0].status, 'paused')
  assert.equal(stale.jobs[0].routeStatus, 'recoverable_stale')
  assert.deepEqual(stale.staleJobIds, ['job_stale'])
}

function testRecurringLateRunRecovery() {
  const jobs = [{
    id: 'job_daily_report',
    status: 'completed',
    routeStatus: 'completed',
    recurring: {
      enabled: true,
      cadence: 'daily',
      nextRunAt: '2026-05-15T09:00:00.000Z',
      pendingLateRun: false,
    },
  }]

  const missed = reconcileRecurringRecovery(jobs, {
    now: '2026-05-15T09:30:00.000Z',
    cooldownActive: true,
    runtimeOutage: false,
    providerHealthy: false,
  })
  assert.equal(missed.jobs[0].recurring.lastOutcome, 'missed_due_to_cooldown')
  assert.equal(missed.jobs[0].recurring.pendingLateRun, true)
  assert.deepEqual(missed.missedJobIds, ['job_daily_report'])

  const resumed = reconcileRecurringRecovery(missed.jobs, {
    now: '2026-05-15T10:00:00.000Z',
    cooldownActive: false,
    runtimeOutage: false,
    providerHealthy: true,
  })
  assert.equal(resumed.createdLateRuns.length, 1)
  assert.equal(resumed.createdLateRuns[0].routeStatus, 'resumed_late')

  const completed = markRecurringRunCompletedLate(resumed.createdLateRuns[0], { now: '2026-05-15T10:10:00.000Z' })
  assert.equal(completed.routeStatus, 'completed_late')
  assert.equal(completed.recurring.lastOutcome, 'completed_late')
}

async function testExecutorStatusSurface() {
  const { res, data } = await request('/api/executor/status', {
    headers: {
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
  })
  assert.equal(res.status, 200)
  assert.equal(typeof data.mc_governed, 'boolean')
  assert.equal(typeof data.break_glass_mode, 'boolean')
  assert.ok(Array.isArray(data.allowed_actions))
  assert.ok(Object.prototype.hasOwnProperty.call(data, 'last_mc_heartbeat'))
  assert.ok(data.claude_cli)
}

async function testCooldownPausesHeavyExecution() {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-phase-c-'))
  for (const file of ['INITIAL_SCOPE.md', 'BUILD_PLAN.md', 'ARCHITECTURE_SPEC.md', 'IMPLEMENTATION_SCOPE.json']) {
    fs.writeFileSync(path.join(projectPath, file), file.endsWith('.json') ? JSON.stringify({ ok: true }, null, 2) : `seed for ${file}`)
  }
  const { res, data } = await request('/api/hermes/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'Nettie',
      type: 'execution',
      inputPayload: {
        task: 'Build the new autonomous deployment pipeline',
        text: 'Build the new autonomous deployment pipeline',
        assignedDepartmentHead: 'Van',
        projectPath,
      },
    }),
  })
  assert.equal(res.status, 202, 'heavy execution should pause instead of failing during cooldown')
  assert.match(String(data.status || ''), /paused/i, 'heavy execution should be paused during provider cooldown')
  assert.match(JSON.stringify(data.result || {}), /blocked_by_provider|provider cooldown|paused/i, 'paused execution should report provider block')
}

async function testBreakGlassRecoveryAllowed() {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-phase-c-recovery-'))
  for (const file of ['INITIAL_SCOPE.md', 'BUILD_PLAN.md', 'ARCHITECTURE_SPEC.md', 'IMPLEMENTATION_SCOPE.json']) {
    fs.writeFileSync(path.join(projectPath, file), file.endsWith('.json') ? JSON.stringify({ ok: true }, null, 2) : `seed for ${file}`)
  }
  const { res, data } = await request('/api/hermes/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'Nettie',
      type: 'execution',
      executeNow: true,
      executor: 'hermes',
      breakGlassMode: true,
      inputPayload: {
        task: 'Run recovery diagnostics for executor heartbeat only',
        text: 'Run recovery diagnostics for executor heartbeat only',
        assignedDepartmentHead: 'Van',
        breakGlassMode: true,
        projectPath,
      },
    }),
  })
  assert.ok([200, 202].includes(res.status), 'break-glass recovery diagnostics should be allowed')
  assert.ok(!/blocked outside break-glass recovery/i.test(JSON.stringify(data)), 'break-glass diagnostic path should not be blocked')
}

async function main() {
  const { res, data } = await request('/api/health')
  assert.equal(res.status, 200)
  assert.equal(data.ok, true)
  testClaudeAssessment()
  testHermesGovernance()
  testCooldownPauseAndRecovery()
  testStaleWorkerRecovery()
  testRecurringLateRunRecovery()
  await testExecutorStatusSurface()
  await testCooldownPausesHeavyExecution()
  await testBreakGlassRecoveryAllowed()
  console.log('Phase C governed runtime tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
