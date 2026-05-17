import assert from 'assert/strict'
import fs from 'fs'
import path from 'path'

const BASE = 'http://127.0.0.1:4174'
const RUNTIME = '/home/patrick/mission-control/runtime'

async function request(pathname, options = {}) {
  const res = await fetch(`${BASE}${pathname}`, options)
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { res, data }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

async function main() {
  const checkpoint = await request('/api/runtime/checkpoint')
  assert.equal(checkpoint.res.status, 200)
  assert.ok(checkpoint.data.restartEpoch >= 1)
  assert.ok(Array.isArray(checkpoint.data.activeJobs))
  assert.ok(checkpoint.data.reconciliationQueueSummary)
  assert.ok(checkpoint.data.executorForecast)

  const saved = await request('/api/runtime/checkpoint', { method: 'POST' })
  assert.equal(saved.res.status, 200)
  assert.equal(saved.data.saved, true)
  assert.ok(saved.data.checkpointId)

  const exported = await request('/api/runtime/snapshot/export')
  assert.equal(exported.res.status, 200)
  assert.ok(exported.data.runtimeHealth)
  assert.ok(exported.data.queueTopologySummary)
  assert.ok(exported.data.recoveryState)
  assert.ok(exported.data.budgetState)
  assert.ok(exported.data.reconciliationDebt)
  assert.ok(exported.data.checkpoint)

  const beforeChain = await request('/api/runtime/summaries/chain')
  assert.equal(beforeChain.res.status, 200)
  const beforeCount = beforeChain.data.summaries.length

  const rollup = await request('/api/runtime/summaries/rollup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'hourly' }),
  })
  assert.equal(rollup.res.status, 201)
  assert.ok(rollup.data.summaryId)
  assert.ok(rollup.data.compressionVersion >= 1)

  const compressed2 = await request('/api/runtime/summaries/compress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'hourly' }),
  })
  assert.equal(compressed2.res.status, 201)
  assert.ok(compressed2.data.previousSummaryId)
  assert.ok(compressed2.data.deltaEventCount >= 0)
  assert.ok(Array.isArray(compressed2.data.unresolvedItems))

  const latest = await request('/api/runtime/summaries/latest')
  assert.equal(latest.res.status, 200)
  assert.equal(latest.data.summaryId, compressed2.data.summaryId)
  assert.ok(latest.data.sourceTrace)
  assert.ok(latest.data.sourceTrace.eventCount >= 0)
  assert.ok(Array.isArray(latest.data.unresolvedItems))
  assert.ok(typeof latest.data.unresolvedItemsPreserved === 'number')

  const chain = await request('/api/runtime/summaries/chain')
  assert.equal(chain.res.status, 200)
  assert.ok(Array.isArray(chain.data.summaries))
  assert.ok(chain.data.summaries.length >= beforeCount)
  assert.ok(chain.data.summaries.some((item) => item.summaryId === compressed2.data.previousSummaryId))

  const byId = await request(`/api/runtime/summaries/${compressed2.data.summaryId}`)
  assert.equal(byId.res.status, 200)
  assert.equal(byId.data.summaryId, compressed2.data.summaryId)

  const allSummaries = await request('/api/runtime/summaries')
  assert.equal(allSummaries.res.status, 200)
  assert.ok(Array.isArray(allSummaries.data.summaries))

  const compactNettie = await request('/api/context/compact/nettie')
  assert.equal(compactNettie.res.status, 200)
  assert.equal(compactNettie.data.agent, 'nettie')
  assert.ok(Array.isArray(compactNettie.data.nextActions))
  assert.ok(compactNettie.data.summary)

  const compactVan = await request('/api/context/compact/van')
  assert.equal(compactVan.res.status, 200)
  assert.equal(compactVan.data.agent, 'van')

  const eviction = await request('/api/context/eviction-candidates')
  assert.equal(eviction.res.status, 200)
  assert.ok(Array.isArray(eviction.data.candidates))
  assert.equal(eviction.data.destructive, false)

  const reconSnap1 = await request('/api/reconciliation/snapshots', { method: 'POST' })
  assert.equal(reconSnap1.res.status, 201)
  assert.ok(reconSnap1.data.snapshotId)
  assert.ok(reconSnap1.data.debtScore >= 0)

  const reconSnap2 = await request('/api/reconciliation/snapshots', { method: 'POST' })
  assert.equal(reconSnap2.res.status, 201)
  assert.ok(reconSnap2.data.previousSnapshotId)
  assert.ok(reconSnap2.data.comparison)

  const reconSnapList = await request('/api/reconciliation/snapshots')
  assert.equal(reconSnapList.res.status, 200)
  assert.ok(Array.isArray(reconSnapList.data.snapshots))
  assert.ok(reconSnapList.data.snapshots.length >= 2)

  const checkpointFile = path.join(RUNTIME, 'runtime-checkpoint.json')
  const summariesFile = path.join(RUNTIME, 'runtime-summaries.json')
  const reconFile = path.join(RUNTIME, 'reconciliation-snapshots.json')
  const eventsFile = path.join(RUNTIME, 'runtime-events.jsonl')
  const journalFile = path.join(RUNTIME, 'runtime-journal.jsonl')
  const snapshotsDir = path.join(RUNTIME, 'snapshots')

  for (const file of [checkpointFile, summariesFile, reconFile, eventsFile, journalFile]) {
    assert.ok(fs.existsSync(file), `expected runtime continuity file ${file}`)
  }
  assert.ok(fs.existsSync(snapshotsDir), 'expected versioned snapshot directory')
  assert.ok(fs.readdirSync(snapshotsDir).some((name) => name.endsWith('.json')), 'expected versioned snapshots to exist')

  const checkpointJson = readJson(checkpointFile)
  const summariesJson = readJson(summariesFile)
  const reconJson = readJson(reconFile)
  assert.ok(checkpointJson.checkpointId)
  assert.ok(Array.isArray(summariesJson.summaries))
  assert.ok(Array.isArray(reconJson.snapshots))

  const eventLines = fs.readFileSync(eventsFile, 'utf8').trim().split('\n').filter(Boolean)
  const journalLines = fs.readFileSync(journalFile, 'utf8').trim().split('\n').filter(Boolean)
  assert.ok(eventLines.length >= 3, 'expected event ledger entries to be appended')
  assert.ok(journalLines.length >= 3, 'expected journal entries to be appended')

  console.log('Runtime continuity memory tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
