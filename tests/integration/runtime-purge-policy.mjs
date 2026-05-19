import assert from 'assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  buildRuntimePurgePaths,
  buildPurgeReview,
  applyPurgeToJobs,
  updateMissionStateJobs,
  savePurgeArchiveIndex,
  loadPurgeArchiveIndex,
  writeJson,
  readJson,
} from '../../lib/runtimePurge.js'

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-purge-'))
const runtimeDir = path.join(tmpRoot, 'runtime')
fs.mkdirSync(runtimeDir, { recursive: true })
const paths = buildRuntimePurgePaths(tmpRoot)

const jobs = [
  { id: 'job_test_1', jobId: 'job_test_1', task: 'Stale test', status: 'queued', updatedAt: '2026-05-01T00:00:00.000Z', source: 'MC UI' },
  { id: 'job_sched_1', jobId: 'job_sched_1', task: 'Dana Daily Pre-Market Opportunity Report', status: 'running', updatedAt: new Date().toISOString(), source: 'cron' },
  { id: 'job_review_1', jobId: 'job_review_1', task: 'Custom production launch', status: 'queued', updatedAt: new Date().toISOString(), source: 'manual' },
]
const state = { jobs: jobs.map((job) => ({ id: job.id, status: job.status, routeStatus: job.status, updatedAt: job.updatedAt })) }
writeJson(paths.jobsPath, jobs)
writeJson(paths.statePath, state)

const review = buildPurgeReview({ jobs, now: new Date().toISOString() })
assert.ok(review.buckets.PURGE_FROM_ACTIVE.some((job) => job.id === 'job_test_1'), 'stale test should be a purge candidate')
assert.ok(review.buckets.KEEP_ACTIVE.some((job) => job.id === 'job_sched_1'), 'scheduled job should stay active')
assert.ok(review.buckets.NEEDS_REVIEW.some((job) => job.id === 'job_review_1'), 'uncertain fresh job should require review')

const { updatedJobs, purgedJobs } = applyPurgeToJobs(jobs, review.buckets.PURGE_FROM_ACTIVE, new Date().toISOString())
assert.ok(purgedJobs.length === 1, 'one job should be purged')
assert.equal(updatedJobs.find((job) => job.id === 'job_test_1').status, 'archived', 'purged job should be archived')
assert.equal(updatedJobs.find((job) => job.id === 'job_sched_1').status, 'running', 'scheduled job should remain active')

const updatedState = updateMissionStateJobs(state.jobs, updatedJobs, new Date().toISOString())
assert.equal(updatedState.find((job) => job.id === 'job_test_1').status, 'archived', 'state mirror should mark purged job archived')

savePurgeArchiveIndex(paths, { purgedJobIds: ['job_test_1'], purgedSourceRefs: ['MC UI'] })
const purgeIndex = loadPurgeArchiveIndex(paths)
assert.ok(purgeIndex.purgedJobIds.includes('job_test_1'), 'purge index should preserve purged job id')
assert.ok(purgeIndex.purgedSourceRefs.includes('MC UI'), 'purge index should preserve purged source ref')

const reloadedJobs = readJson(paths.jobsPath, [])
assert.ok(Array.isArray(reloadedJobs), 'historical archive source file should remain accessible')

console.log('Runtime purge policy tests passed')
