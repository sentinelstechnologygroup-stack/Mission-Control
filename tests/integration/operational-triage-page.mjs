import assert from 'assert/strict'
import fs from 'fs'

const app = fs.readFileSync('/home/patrick/mission-control/src/App.jsx', 'utf8')
const nav = fs.readFileSync('/home/patrick/mission-control/src/components/mission-control/shell-config.js', 'utf8')
const triagePage = fs.readFileSync('/home/patrick/mission-control/src/pages/OperationalTriage.jsx', 'utf8')

assert.ok(app.includes('path="/triage"'), 'App route for /triage missing')
assert.ok(nav.includes('path: "/triage"'), 'Nav link for /triage missing')
for (const marker of ['Queue Pressure', 'Blocker Breakdown', 'Reconciliation Panel', 'Lock Conflict Panel', 'Stale Debt Panel', 'Operator Next Actions', 'Active Incidents', 'Artifact Freshness', 'Raw Source Alignment']) {
  assert.ok(triagePage.includes(marker), `OperationalTriage.jsx missing section ${marker}`)
}

const response = await fetch('http://127.0.0.1:4174/api/home/summary')
const text = await response.text()
const data = JSON.parse(text)
assert.equal(response.status, 200)
const operationalConfidence = (data.quickStats || []).find((item) => item.label === 'Operational Confidence')
assert.ok(operationalConfidence, 'Operational Confidence stat missing')
assert.notEqual(operationalConfidence.value, '[object Object]', 'Operational confidence still renders as [object Object]')
assert.ok(!text.includes('Demo.ai Website'), 'Old fake Home string still present in live response')

console.log('Operational triage page tests passed')
