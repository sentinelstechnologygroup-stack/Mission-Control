import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  EXPECTED_MORNING_JOBS,
  buildRuntimePurgePaths,
  buildPurgeReview,
  buildSnapshotCounts,
  nowIso,
  readJson,
  writeJson,
  writeMarkdown,
  sha256File,
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
  const gitHash = fs.existsSync(path.join(repoRoot, '.git')) ? (await getJson('http://127.0.0.1:4174/api/health').catch(() => null), null) : null
  const snapshot = {
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
  return snapshot
}

function renderMarkdown(review, snapshot) {
  const projected = review.projectedCounts
  return `# Runtime Purge Dry Run\n\nGenerated: ${nowIso()}\n\n## Pre-purge counts\n- ledger total: ${snapshot.currentCounts.ledgerTotal}\n- active-work total: ${snapshot.currentCounts.activeWorkTotal}\n- queued: ${snapshot.currentCounts.queued}\n- running: ${snapshot.currentCounts.running}\n- blocked: ${snapshot.currentCounts.blocked}\n- stale: ${snapshot.currentCounts.stale}\n- lock conflicts: ${snapshot.currentCounts.lockConflicts}\n\n## Classification totals\n- PURGE_FROM_ACTIVE: ${review.buckets.PURGE_FROM_ACTIVE.length}\n- KEEP_ACTIVE: ${review.buckets.KEEP_ACTIVE.length}\n- NEEDS_REVIEW: ${review.buckets.NEEDS_REVIEW.length}\n- ARCHIVE_ONLY: ${review.buckets.ARCHIVE_ONLY.length}\n\n## Projected post-purge counts\n- ledger total: ${projected.ledgerTotal}\n- active-work total: ${projected.activeWorkTotal}\n- queued: ${projected.queued}\n- running: ${projected.running}\n- blocked: ${projected.blocked}\n- stale: ${projected.stale}\n- lock conflicts: ${projected.lockConflicts}\n\n## Top purge candidates\n${review.buckets.PURGE_FROM_ACTIVE.slice(0, 20).map((job) => `- ${job.jobId || job.id}: ${job.task || job.title} — ${job.purgeReview.reason}`).join('\n')}\n\n## Needs review\n${review.buckets.NEEDS_REVIEW.slice(0, 20).map((job) => `- ${job.jobId || job.id}: ${job.task || job.title} — ${job.purgeReview.reason}`).join('\n') || '- none'}\n`}

async function main() {
  const snapshot = await buildSnapshot('pre-purge')
  const jobs = readJson(paths.jobsPath, []) || []
  const registryOpenJobs = [
    ...(snapshot.workRegistry?.active || []),
    ...(snapshot.workRegistry?.queued || []),
    ...(snapshot.workRegistry?.running || []),
    ...(snapshot.workRegistry?.paused || []),
    ...(snapshot.workRegistry?.blocked || []),
  ]
  const allJobs = [...jobs]
  const seen = new Set(allJobs.map((job) => String(job.jobId || job.id || '').trim()))
  for (const job of registryOpenJobs) {
    const id = String(job.jobId || job.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    allJobs.push(job)
  }
  const review = buildPurgeReview({ jobs: allJobs, now: snapshot.timestamp, expected: EXPECTED_MORNING_JOBS })

  const snapshotPath = path.join(paths.snapshotsDir, `${timestamp}-pre-purge-snapshot.json`)
  writeJson(snapshotPath, snapshot)
  writeJson(path.join(paths.snapshotsDir, 'latest-pre-purge-snapshot.json'), snapshot)
  writeJson(path.join(paths.reviewDir, 'purge-candidates.json'), review.buckets.PURGE_FROM_ACTIVE)
  writeJson(path.join(paths.reviewDir, 'keep-active.json'), review.buckets.KEEP_ACTIVE)
  writeJson(path.join(paths.reviewDir, 'needs-human-review.json'), review.buckets.NEEDS_REVIEW)
  writeMarkdown(path.join(paths.reportsDir, 'runtime-purge-dry-run.md'), renderMarkdown(review, snapshot))

  const result = {
    snapshotPath,
    jobsPath: paths.jobsPath,
    jobsHash: sha256File(paths.jobsPath),
    stateHash: sha256File(paths.statePath),
    review,
  }
  console.log(JSON.stringify(result, null, 2))
}

await main()
