import assert from 'assert/strict'

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

async function testDepartmentWorkflowRegistry() {
  const { res, data } = await request('/api/departments/workflows')
  assert.equal(res.status, 200)
  assert.ok(Array.isArray(data.departments))
  const nettie = data.departments.find((item) => item.owner === 'Nettie')
  const van = data.departments.find((item) => item.owner === 'Van')
  const perry = data.departments.find((item) => item.owner === 'Perry')
  assert.ok(nettie && van && perry)
  assert.ok(Array.isArray(van.allowedTaskTypes) && van.allowedTaskTypes.includes('code'))
  assert.ok(Array.isArray(perry.qaGates) && perry.qaGates.length >= 1)
}

async function testTokenOverview() {
  const { res, data } = await request('/api/tokens/overview')
  assert.equal(res.status, 200)
  assert.ok(data.providerState)
  assert.ok(Array.isArray(data.perAgent))
  assert.ok(Array.isArray(data.perJob))
  assert.ok(Array.isArray(data.perProviderModel))
  assert.ok(data.totals)
  assert.ok('daily' in data.totals)
  assert.ok('weekly' in data.totals)
  assert.ok(Array.isArray(data.warnings))
}

async function testPlainEnglishDepartmentRouting() {
  const { res, data } = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Have Van take ownership of the Mission Control CI failure queue and report failures to Perry.' }),
  })
  assert.equal(res.status, 201)
  assert.ok(data.createdJob)
  assert.equal(data.createdJob.owner, 'Van')
  assert.ok(data.createdJob.workflow)
  assert.equal(data.createdJob.workflow.department, 'Van')
  assert.ok(data.createdJob.workflow.nextAction)
  assert.ok(data.createdJob.workflow.reportingOwner)
  assert.ok(Array.isArray(data.createdJob.workflow.reviewChain))
  assert.ok(data.createdJob.workflow.qaGate)
}

async function main() {
  await testDepartmentWorkflowRegistry()
  await testTokenOverview()
  await testPlainEnglishDepartmentRouting()
  console.log('Department workflows and token tracking tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
