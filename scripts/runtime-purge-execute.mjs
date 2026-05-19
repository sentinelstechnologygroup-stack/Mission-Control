import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import {
  EXPECTED_MORNING_JOBS,
  buildRuntimePurgePaths,
  buildPurgeReview,
  buildSnapshotCounts,
  applyPurgeToJobs,
  updateMissionStateJobs,
  loadPurgeArchiveIndex,
  savePurgeArchiveIndex,
  nowIso,
  readJson,
  writeJson,
  writeMarkdown,
  sha256File,
  ensureDir,
} from '../lib/runtimePurge.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.join(__dirname, '..')
const paths = buildRuntimePurgePaths(repoRoot)
const timestamp = nowIso().replace(/[:.]/g, '-').replace('T', '-').replace('Z', '')

async function getJson(url) {
  const response = await fetch(url)
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${url} failed: ${response.status} ${text}`)
  }
  return JSON.parse(text)
}

async function buildSnapshot(label) {
  const base = 'http://127.0.0.1:4174'
  const [ledger, activeWork, registry, blockedJobs, staleJobs, reconciliation, reportsStatus, locks] = await Promise.all([
    getJson(`${base}/api/jobs/ledger`),
    getJson(`${base}/api/active-work`),
    getJson(`${base}/api/work/registry`),
    getJson(`${base}/api/jobs/blocked`),
    getJson(`${base}/api/jobs/stale`),
    getJson(`${base}/api/runtime/reconciliation`),
    getJson(`${base}/api/reports/status`),
    getJson(`${base}/api/runtime/locks`),
  ])
  const cronAudit = readJson(path.join(paths.scheduledTruthDir, 'cron-jobs-audit-latest.json'), { jobs: [] })
  return {
    label,
    timestamp: nowIso(),
    gitHash: process.env.GIT_HASH || null,
    currentCounts: buildSnapshotCounts({ ledger, activeWork, registry, blocked: blockedJobs, stale: staleJobs, locks, reconciliation }),
    ledgerJobs: ledger,
    activeWorkView: activeWork,
    workRegistry: registry,
    blockedJobs,
    staleJobs,
    lockConflicts: locks.lockConflicts || [],
    runtimeLocks: locks,
    runtimeReconciliation: reconciliation,
    reportFreshness: reportsStatus,
    scheduledJobsFound: cronAudit.jobs || [],
  }
}

function buildMorningExpectationReport() {
  return `# Morning Scheduled Job Truth Test\n\nGenerated: ${nowIso()}\n\nExpected morning jobs:\n${EXPECTED_MORNING_JOBS.map((job) => `- ${job.name} — owner: ${job.owner} — source: ${job.scheduleSource}`).join('\n')}\n\nExpected behavior:\n- If scheduled jobs run successfully and complete, active counts should return to 0 after completion.\n- If scheduled jobs fail or stall, blocked/stale counts should increase and the reason should be visible.\n- If no scheduled jobs appear at all, scheduling is broken.\n- Historical ledger count may remain high, but active dashboards should stay clean between scheduled runs.\n`}

async function main() {
  const preSnapshot = await buildSnapshot('pre-purge')
  const jobs = readJson(paths.jobsPath, []) || []
  const state = readJson(paths.statePath, {}) || {}
  const registryOpenJobs = [
    ...(preSnapshot.workRegistry?.active || []),
    ...(preSnapshot.workRegistry?.queued || []),
    ...(preSnapshot.workRegistry?.running || []),
    ...(preSnapshot.workRegistry?.paused || []),
    ...(preSnapshot.workRegistry?.blocked || []),
  ]
  const allJobs = [...jobs]
  const seen = new Set(allJobs.map((job) => String(job.jobId || job.id || '').trim()))
  for (const job of registryOpenJobs) {
    const id = String(job.jobId || job.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    allJobs.push(job)
  }
  const review = buildPurgeReview({ jobs: allJobs, now: preSnapshot.timestamp, expected: EXPECTED_MORNING_JOBS })

  const archiveDir = ensureDir(path.join(paths.archiveRoot, timestamp))
  const beforeHashes = {
    jobsSha256: sha256File(paths.jobsPath),
    stateSha256: sha256File(paths.statePath),
  }

  writeJson(path.join(paths.snapshotsDir, `${timestamp}-pre-purge-snapshot.json`), preSnapshot)
  writeJson(path.join(paths.snapshotsDir, 'latest-pre-purge-snapshot.json'), preSnapshot)
  writeJson(path.join(paths.reviewDir, 'purge-candidates.json'), review.buckets.PURGE_FROM_ACTIVE)
  writeJson(path.join(paths.reviewDir, 'keep-active.json'), review.buckets.KEEP_ACTIVE)
  writeJson(path.join(paths.reviewDir, 'needs-human-review.json'), review.buckets.NEEDS_REVIEW)

  const { updatedJobs, purgedJobs, purgedLocks } = applyPurgeToJobs(jobs, review.buckets.PURGE_FROM_ACTIVE, nowIso())
  const updatedStateJobs = updateMissionStateJobs(state.jobs || [], updatedJobs, nowIso())
  const keepJobIds = new Set([
    ...review.buckets.KEEP_ACTIVE.map((job) => String(job.jobId || job.id)),
    ...review.buckets.NEEDS_REVIEW.map((job) => String(job.jobId || job.id)),
  ])
  const updatedWorkers = (state.workers || []).filter((worker) => {
    const workerStatus = String(worker?.status || '').toLowerCase()
    const workerJobId = String(worker?.jobId || worker?.id || '')
    if (!keepJobIds.has(workerJobId)) return false
    return workerStatus === 'running'
  })
  const updatedState = { ...state, jobs: updatedStateJobs, workers: updatedWorkers, system: { ...(state.system || {}), updatedAt: nowIso() } }

  writeJson(path.join(archiveDir, 'purged-jobs.json'), purgedJobs)
  writeJson(path.join(archiveDir, 'purged-locks.json'), purgedLocks)

  writeJson(paths.jobsPath, updatedJobs)
  writeJson(paths.statePath, updatedState)

  const purgeIndex = loadPurgeArchiveIndex(paths)
  const nextIndex = {
    purgedJobIds: Array.from(new Set([...(purgeIndex.purgedJobIds || []), ...purgedJobs.map((job) => job.jobId)])),
    purgedSourceRefs: Array.from(new Set([
      ...(purgeIndex.purgedSourceRefs || []),
      ...review.buckets.PURGE_FROM_ACTIVE.map((job) => String(job.source || job.sourceRef || '').trim()).filter(Boolean),
    ])),
  }
  savePurgeArchiveIndex(paths, nextIndex)

  const afterHashes = {
    jobsSha256: sha256File(paths.jobsPath),
    stateSha256: sha256File(paths.statePath),
  }

  const manifest = {
    executedAt: nowIso(),
    archiveDir,
    beforeHashes,
    afterHashes,
    purgedJobsCount: purgedJobs.length,
    purgedLocksCount: purgedLocks.length,
    needsHumanReviewCount: review.buckets.NEEDS_REVIEW.length,
    keepActiveCount: review.buckets.KEEP_ACTIVE.length,
    projectedCounts: review.projectedCounts,
  }
  writeJson(path.join(archiveDir, 'purge-manifest.json'), manifest)

  const nightlyBaseline = {
    cleanedAt: nowIso(),
    expectedMorningJobs: EXPECTED_MORNING_JOBS.map((job) => job.name),
    expectedBehavior: {
      successReturnsActiveToZero: true,
      failureRaisesBlockedOrStale: true,
      missingScheduledJobsMeansSchedulingBroken: true,
    },
  }
  writeJson(path.join(paths.scheduledTruthDir, 'nightly-clean-baseline.json'), nightlyBaseline)
  writeMarkdown(path.join(paths.reportsDir, 'morning-scheduled-job-truth-test.md'), buildMorningExpectationReport())

  console.log(JSON.stringify({ manifest, nightlyBaseline }, null, 2))
}

await main()
