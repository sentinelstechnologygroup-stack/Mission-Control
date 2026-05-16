import assert from 'assert/strict'
import fs from 'fs'
import {
  buildDependencyGraph,
  buildCooldownBlockedListArtifact,
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

function sampleJobs() {
  return [
    {
      id: 'job_upstream',
      jobId: 'job_upstream',
      task: 'Build shared API foundation',
      owner: 'Van',
      status: 'queued',
      routeStatus: 'queued',
      updatedAt: '2026-05-15T10:00:00.000Z',
    },
    {
      id: 'job_downstream',
      jobId: 'job_downstream',
      task: 'Deploy website after shared API foundation',
      owner: 'Van',
      status: 'queued',
      routeStatus: 'queued',
      dependsOn: ['job_upstream'],
      updatedAt: '2026-05-15T10:05:00.000Z',
    },
    {
      id: 'job_done',
      jobId: 'job_done',
      task: 'Create scope pack',
      owner: 'Blueprint',
      status: 'completed',
      routeStatus: 'completed',
      updatedAt: '2026-05-15T09:00:00.000Z',
    },
    {
      id: 'job_unblock',
      jobId: 'job_unblock',
      task: 'Begin build after scope pack',
      owner: 'Van',
      status: 'queued',
      routeStatus: 'queued',
      dependsOn: ['job_done'],
      updatedAt: '2026-05-15T10:10:00.000Z',
    },
  ]
}

function testDependencyGraphBasics() {
  const graph = buildDependencyGraph({ jobs: sampleJobs(), now: '2026-05-15T10:15:00.000Z' })
  assert.equal(graph.blocked.length, 1)
  assert.equal(graph.blocked[0].jobId, 'job_downstream')
  assert.equal(graph.blocked[0].dependencyStatus, 'blocked_by_dependency')
  assert.deepEqual(graph.blocked[0].blockedBy, ['job_upstream'])
  assert.equal(graph.unblockReady.length, 1)
  assert.equal(graph.unblockReady[0].jobId, 'job_unblock')
  assert.equal(graph.unblockReady[0].dependencyStatus, 'unblock_ready')
  assert.ok(graph.topology.nodes.length >= 4)
  assert.ok(graph.topology.edges.some((edge) => edge.from === 'job_done' && edge.to === 'job_unblock'))
}

function testQueueRespectsDependencies() {
  const graph = buildDependencyGraph({ jobs: sampleJobs(), now: '2026-05-15T10:15:00.000Z' })
  const queue = buildQueuePriorities({
    registry: {
      active: [],
      running: [],
      queued: sampleJobs().filter((job) => job.status === 'queued'),
      paused: [],
      blocked: [],
      completedRecent: [],
    },
    recoveryReport: { reconciliationRequired: false, jobs: [] },
    dependencyGraph: graph,
    claudeValidated: false,
    now: '2026-05-15T10:15:00.000Z',
  })
  const downstream = queue.priorities.find((item) => item.jobId === 'job_downstream')
  const unblock = queue.priorities.find((item) => item.jobId === 'job_unblock')
  assert(downstream)
  assert(unblock)
  assert.equal(downstream.executable, false)
  assert.equal(downstream.blockedReason, 'dependency_blocked')
  assert.equal(unblock.executable, true)
  const next = buildTopNextActions(queue.priorities, { limit: 10 })
  assert.equal(next.nextActions.some((item) => item.jobId === 'job_downstream' && item.executable), false)
}

function testCooldownBlockedListArtifactDesign() {
  const graph = buildDependencyGraph({ jobs: sampleJobs(), now: '2026-05-15T10:15:00.000Z' })
  const artifact = buildCooldownBlockedListArtifact({
    queuePriorities: {
      priorities: [
        { jobId: 'job_downstream', recoveryClassification: null, blockedReason: 'dependency_blocked', localAIDraftEligible: false, selectedExecutor: 'gpt_codex', recommendedAction: 'Wait for upstream.' },
        { jobId: 'job_unblock', recoveryClassification: 'safe_to_resume', blockedReason: null, localAIDraftEligible: false, selectedExecutor: 'gpt_codex', recommendedAction: 'Run build now.' },
      ],
      counts: {},
    },
    dependencyGraph: graph,
    recoveryReport: { jobs: [{ jobId: 'job_unblock', recoveryClassification: 'safe_to_resume', autoResumeAllowed: false }] },
    now: '2026-05-15T10:15:00.000Z',
  })
  assert.equal(artifact.name, 'mission-control-ledger-queue-blocked-list')
  assert.ok(Array.isArray(artifact.sections.dependencyBlockedJobs))
  assert.ok(Array.isArray(artifact.sections.safeToResumeCandidates))
  assert.ok(Array.isArray(artifact.sections.deepThinkingJobs))
  assert.ok(Array.isArray(artifact.sections.localAIEligibleJobs))
}

async function testLiveDependencyEndpoints() {
  const [{ res: topologyRes, data: topology }, { res: blockedRes, data: blocked }, { res: unblockRes, data: unblock }, { res: blockedListRes, data: blockedList }, { res: statusRes, data: status }] = await Promise.all([
    request('/api/dependencies/topology'),
    request('/api/dependencies/blocked'),
    request('/api/dependencies/unblock-ready'),
    request('/api/recovery/mission-control-ledger-queue-blocked-list'),
    request('/api/executors/status', { headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` } }),
  ])
  assert.equal(topologyRes.status, 200)
  assert.equal(blockedRes.status, 200)
  assert.equal(unblockRes.status, 200)
  assert.equal(blockedListRes.status, 200)
  assert.equal(statusRes.status, 200)
  assert.ok(Array.isArray(topology.topology.nodes))
  assert.ok(Array.isArray(blocked.blocked))
  assert.ok(Array.isArray(unblock.unblockReady))
  assert.equal(blockedList.name, 'mission-control-ledger-queue-blocked-list')
  assert.ok(blockedList.sections)
  assert.equal(typeof status.localAIAvailable, 'boolean')
  assert.equal(typeof status.deepWorkPaused, 'boolean')
  assert.equal(typeof status.localWorkActive, 'boolean')
  assert.ok(status.nettieLocalFallback)
}

async function main() {
  testDependencyGraphBasics()
  testQueueRespectsDependencies()
  testCooldownBlockedListArtifactDesign()
  await testLiveDependencyEndpoints()
  console.log('Factory dependency graph tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
