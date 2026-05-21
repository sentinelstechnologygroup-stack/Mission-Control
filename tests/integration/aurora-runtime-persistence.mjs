import fs from 'fs'
import assert from 'assert/strict'

const BASE = 'http://127.0.0.1:4174'
const STATE_FILE = new URL('../../runtime/mission-control-state.json', import.meta.url)

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

async function main() {
  const initial = await request('/api/aurora/state')
  assert.equal(initial.res.status, 200)
  assert.ok(Array.isArray(initial.data.jobs))
  assert.ok(Array.isArray(initial.data.department_workflows))
  assert.ok(Array.isArray(initial.data.workflow_nodes))
  assert.ok(initial.data.jobs.length >= 8, 'seeded Aurora lanes should be present')

  const command = 'Create a high-priority task to follow up with the investor packet tomorrow and note the desk handoff.'
  const created = await request('/api/aurora/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
  assert.equal(created.res.status, 201)
  assert.equal(created.data.ok, true)
  assert.equal(created.data.bundle.job.original_command, command)
  assert.ok(created.data.state.jobs.some((job) => job.id === created.data.bundle.job.id))
  assert.ok(created.data.state.department_workflows.some((workflow) => workflow.job_id === created.data.bundle.job.id))
  assert.ok(created.data.state.workflow_nodes.some((node) => node.job_id === created.data.bundle.job.id))
  assert.ok(created.data.state.workflow_edges.some((edge) => edge.job_id === created.data.bundle.job.id))
  assert.ok(created.data.state.evidence_logs.some((entry) => entry.job_id === created.data.bundle.job.id))
  assert.ok(created.data.state.agent_messages.some((entry) => entry.job_id === created.data.bundle.job.id))
  assert.ok(created.data.state.model_runs.some((entry) => entry.job_id === created.data.bundle.job.id))

  const jobId = created.data.bundle.job.id
  const job = await request(`/api/aurora/jobs/${jobId}`)
  const workflow = await request(`/api/aurora/jobs/${jobId}/workflow`)
  const nodes = await request(`/api/aurora/jobs/${jobId}/nodes`)
  const edges = await request(`/api/aurora/jobs/${jobId}/edges`)
  const evidence = await request(`/api/aurora/jobs/${jobId}/evidence`)
  const messages = await request(`/api/aurora/jobs/${jobId}/messages`)
  const modelRuns = await request(`/api/aurora/jobs/${jobId}/model-runs`)

  assert.equal(job.res.status, 200)
  assert.equal(workflow.res.status, 200)
  assert.equal(nodes.res.status, 200)
  assert.equal(edges.res.status, 200)
  assert.equal(evidence.res.status, 200)
  assert.equal(messages.res.status, 200)
  assert.equal(modelRuns.res.status, 200)
  assert.equal(job.data.id, jobId)
  assert.equal(workflow.data.job_id, jobId)
  assert.ok(Array.isArray(nodes.data) && nodes.data.length >= 5)
  assert.ok(Array.isArray(edges.data) && edges.data.length === nodes.data.length - 1)
  assert.ok(Array.isArray(evidence.data) && evidence.data.length === nodes.data.length)
  assert.ok(Array.isArray(messages.data) && messages.data.length >= 2)
  assert.ok(Array.isArray(modelRuns.data) && modelRuns.data.length >= 1)

  const persisted = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  assert.ok(persisted.aurora)
  assert.ok(persisted.aurora.jobs.some((entry) => entry.id === jobId), 'backend state file should persist Aurora jobs')
  assert.ok(persisted.aurora.workflow_nodes.some((entry) => entry.job_id === jobId), 'backend state file should persist Aurora nodes')
  assert.ok(persisted.aurora.evidence_logs.some((entry) => entry.job_id === jobId), 'backend state file should persist Aurora evidence')

  const stateAfter = await request('/api/aurora/state')
  assert.equal(stateAfter.res.status, 200)
  assert.ok(stateAfter.data.jobs.some((entry) => entry.id === jobId))

  console.log('Aurora runtime persistence test passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
