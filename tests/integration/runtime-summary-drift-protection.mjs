import assert from 'assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  getRuntimeContinuityPaths,
  buildRuntimeSummary,
  applyIncrementalSummary,
  saveRuntimeSummaries,
  loadRuntimeSummaries,
  verifySummaryContinuity,
  buildSummaryDriftReport,
  replayRuntimeLedger,
  saveRuntimeCheckpoint,
  saveReconciliationSnapshots,
} from '../../lib/runtimeContinuity.js'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-drift-'))
const runtimeDir = path.join(tmpRoot, 'runtime')
fs.mkdirSync(runtimeDir, { recursive: true })
const paths = getRuntimeContinuityPaths(runtimeDir)

const summary1 = buildRuntimeSummary({
  type: 'hourly',
  sourceEventCount: 10,
  generatedBy: 'test',
  now: '2026-05-17T00:00:00.000Z',
  snapshot: {
    queuePriorities: { priorities: [{ jobId: 'job-1', title: 'Blocked thing', blockedReason: 'manual_only' }] },
    reconciliationQueues: { queues: { manual_only: { items: [{ jobId: 'job-1', title: 'Blocked thing' }] } } },
    nextActions: { nextActions: [{ jobId: 'job-1', title: 'Blocked thing', executable: false, blockedReason: 'manual_only' }] },
    risks: ['premium executor cooling down'],
  },
})
let store = applyIncrementalSummary({ store: { summaries: [] }, summary: summary1 })
saveRuntimeSummaries(paths.summaries, store)

const summary2 = buildRuntimeSummary({
  type: 'hourly',
  previous: summary1,
  sourceEventCount: 12,
  generatedBy: 'test',
  now: '2026-05-17T01:00:00.000Z',
  snapshot: {
    queuePriorities: { priorities: [{ jobId: 'job-1', title: 'Blocked thing', blockedReason: 'manual_only' }, { jobId: 'job-2', title: 'New blocker', blockedReason: 'stale_running' }] },
    reconciliationQueues: { queues: { manual_only: { items: [{ jobId: 'job-1', title: 'Blocked thing' }, { jobId: 'job-2', title: 'New blocker' }] } } },
    nextActions: { nextActions: [{ jobId: 'job-2', title: 'New blocker', executable: false, blockedReason: 'stale_running' }] },
    risks: ['premium executor cooling down', 'reconciliation debt remains unresolved'],
  },
})
store = applyIncrementalSummary({ store, summary: summary2 })
saveRuntimeSummaries(paths.summaries, store)

const continuity = verifySummaryContinuity({ previous: summary1, summary: summary2 })
assert.equal(continuity.ok, true)
assert.ok(summary2.previousSummaryId === summary1.summaryId)
assert.ok(store.summaries.find((s) => s.summaryId === summary1.summaryId).superseded)
assert.ok(summary2.unresolvedItems.some((item) => item.title === 'Blocked thing'))
assert.ok(summary2.unresolvedItemsPreserved >= 1)

saveRuntimeCheckpoint(paths.checkpoint, { checkpointId: 'cp1', generatedAt: '2026-05-17T01:00:00.000Z' })
saveReconciliationSnapshots(paths.reconciliationSnapshots, { snapshots: [{ snapshotId: 'recon1', generatedAt: '2026-05-17T01:00:00.000Z', debtScore: 10 }] })

const replay = replayRuntimeLedger(paths)
assert.ok(replay.eventCount >= 3)
assert.ok(replay.latestCheckpointId === 'cp1')
assert.ok(replay.latestSummaryId === summary2.summaryId)
assert.ok(replay.latestReconciliationSnapshotId === 'recon1')

const drift = buildSummaryDriftReport({ summariesStore: loadRuntimeSummaries(paths.summaries) })
assert.equal(drift.latestSummaryId, summary2.summaryId)
assert.equal(drift.continuity.ok, true)
assert.equal(drift.driftRiskScore, 0)

console.log('Runtime summary drift protection tests passed')
