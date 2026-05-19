import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export const EXPECTED_MORNING_JOBS = [
  {
    id: 'dana-daily-pre-market-opportunity-report',
    name: 'Dana Daily Pre-Market Opportunity Report',
    owner: 'Dana',
    scheduleSource: 'cronjob:7cd203637ea6',
    commandScript: 'Dana daily pre-market research workflow',
    outputArtifactExpected: 'Dana daily pre-market report artifact',
    taskPatterns: [/dana daily pre market/i, /pre-market opportunity report/i],
  },
  {
    id: 'dana-weekly-investment-rollup',
    name: 'Dana Weekly Investment Rollup',
    owner: 'Dana',
    scheduleSource: 'cronjob:d34ac7ff26c1',
    commandScript: 'Dana weekly investment rollup workflow',
    outputArtifactExpected: 'Dana weekly rollup artifact',
    taskPatterns: [/dana weekly/i, /investment rollup/i],
  },
  {
    id: 'dana-daily-small-cap-opportunity-discovery',
    name: 'Dana Daily Small-Cap Opportunity Discovery',
    owner: 'Dana',
    scheduleSource: 'cronjob:e764312cdd8c',
    commandScript: 'src/agents/dana/jobs/daily_small_cap_job.js',
    outputArtifactExpected: 'Dana daily small-cap report artifact',
    taskPatterns: [/small cap/i, /daily small-cap/i],
  },
  {
    id: 'funboy-launchpad-daily-saas-discovery',
    name: 'Funboy Launchpad Daily SaaS Discovery',
    owner: 'Funboy',
    scheduleSource: 'cronjob:7646e32d2eab',
    commandScript: 'Launchpad daily SaaS opportunity discovery scan',
    outputArtifactExpected: 'Funboy SaaS opportunity scan artifact',
    taskPatterns: [/saas discovery/i, /launchpad/i, /opportunity discovery/i],
  },
  {
    id: 'funboy-appraise-daily-mobile-discovery',
    name: 'Funboy Appraise Daily Mobile Discovery',
    owner: 'Funboy',
    scheduleSource: 'cronjob:664f3efa3403',
    commandScript: 'Appraise daily mobile app opportunity discovery scan',
    outputArtifactExpected: 'Funboy mobile opportunity scan artifact',
    taskPatterns: [/mobile discovery/i, /appraise/i, /opportunity discovery/i],
  },
  {
    id: 'nettie-daily-executive-ci-summary',
    name: 'Nettie Daily Executive CI Summary',
    owner: 'Nettie',
    scheduleSource: 'cronjob:9d04026c2a10',
    commandScript: 'Daily executive CI summary',
    outputArtifactExpected: 'Executive daily CI summary artifact',
    taskPatterns: [/daily executive ci/i, /ci summary/i, /continuous improvement/i],
  },
  {
    id: 'nettie-weekly-executive-ci-wrapup',
    name: 'Nettie Weekly Executive CI Wrap-Up',
    owner: 'Nettie',
    scheduleSource: 'cronjob:0ba1163ea78f',
    commandScript: 'Weekly executive CI wrap-up',
    outputArtifactExpected: 'Executive weekly CI wrap-up artifact',
    taskPatterns: [/weekly executive ci/i, /ci wrap/i],
  },
  {
    id: 'daily-eod-ci-review-and-learning',
    name: 'Daily EOD CI Review And Learning',
    owner: 'Nettie',
    scheduleSource: 'cronjob:e77f54094116',
    commandScript: 'Daily EOD CI review and independent-learning audit',
    outputArtifactExpected: 'Daily EOD CI review artifact',
    taskPatterns: [/eod ci/i, /daily ci review/i, /independent-learning audit/i],
  },
  {
    id: 'options-simulator',
    name: 'Options Simulator',
    owner: 'Dana',
    scheduleSource: 'expected-but-not-found',
    commandScript: 'options simulator scheduled run',
    outputArtifactExpected: 'Options simulator output artifact',
    taskPatterns: [/options simulator/i, /options run/i],
  },
  {
    id: 'runtime-health-checks',
    name: 'Runtime Health Checks',
    owner: 'Nettie',
    scheduleSource: 'expected-supporting-check',
    commandScript: 'Mission Control runtime health / recovery diagnostics',
    outputArtifactExpected: 'Runtime health status evidence',
    taskPatterns: [/health check/i, /recovery diagnostics/i, /executor heartbeat/i],
  },
]

export const OPEN_STATUSES = new Set(['queued', 'running', 'active', 'paused', 'blocked', 'recoverable_stale', 'paused_provider_blocked'])
export const CLOSED_STATUSES = new Set(['complete', 'completed', 'failed', 'cancelled', 'archived'])

const SAFE_PURGE_RE = /\b(test|validation|smoke|ping|lock conflict|syntax check|queue drift|risk test|stale test|heartbeat only|executor heartbeat|recovery diagnostics|bridge validation|cooldown recovery|local bridge|duplicate|retry|orphan|reconciliation_required|recoverable_stale|ci failure queue|run ci on mission control)\b/i
const PRESERVE_RE = /\b(production deploy|client-facing|client facing|launch package|go live|live deployment)\b/i

export function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s:_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeStatus(value = '') {
  const status = normalizeText(value)
  if (status === 'in progress' || status === 'in_progress' || status === 'in-progress') return 'running'
  if (status === 'done') return 'complete'
  if (status === 'stopped') return 'blocked'
  return status || 'queued'
}

export function nowIso() {
  return new Date().toISOString()
}

export function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return null
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
  return dirPath
}

export function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
  return filePath
}

export function writeMarkdown(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, String(content || ''))
  return filePath
}

export function ageHours(job = {}, now = nowIso()) {
  const stamp = Date.parse(job.updatedAt || job.heartbeatAt || job.createdAt || now)
  const current = Date.parse(now)
  if (!Number.isFinite(stamp) || !Number.isFinite(current)) return 0
  return Math.max(0, (current - stamp) / 3600000)
}

export function buildRuntimePurgePaths(repoRoot) {
  const runtimeDir = path.join(repoRoot, 'runtime')
  return {
    repoRoot,
    runtimeDir,
    jobsPath: path.join(runtimeDir, 'jobs.json'),
    statePath: path.join(runtimeDir, 'mission-control-state.json'),
    purgeIndexPath: path.join(runtimeDir, 'purge-archive-index.json'),
    snapshotsDir: path.join(repoRoot, 'runtime-purge-snapshots'),
    reviewDir: path.join(repoRoot, 'runtime-purge-review'),
    archiveRoot: path.join(repoRoot, 'runtime-archive', 'purged-active-runtime'),
    scheduledTruthDir: path.join(runtimeDir, 'scheduled-truth-test'),
    reportsDir: path.join(repoRoot, 'reports', 'production-recovery'),
  }
}

export function loadPurgeArchiveIndex(paths) {
  return readJson(paths.purgeIndexPath, { purgedJobIds: [], purgedSourceRefs: [] })
}

export function savePurgeArchiveIndex(paths, index) {
  return writeJson(paths.purgeIndexPath, index)
}

export function jobMatchesExpectedSchedule(job = {}, expected = EXPECTED_MORNING_JOBS) {
  const text = [job.task, job.title, job.description, job.source, job.routeStatus].filter(Boolean).join(' ')
  for (const item of expected) {
    if ((item.taskPatterns || []).some((pattern) => pattern.test(text))) {
      return item
    }
  }
  return null
}

export function classifyRuntimeJob(job = {}, { expected = EXPECTED_MORNING_JOBS, now = nowIso() } = {}) {
  const status = normalizeStatus(job.status)
  const text = [job.task, job.title, job.description, job.routeStatus, job.blockedReason, job.recoveryNote, job.nextAction, job.source, job.sourceType, job.lockReason].filter(Boolean).join(' ')
  const matchedSchedule = jobMatchesExpectedSchedule(job, expected)
  const hours = ageHours(job, now)
  const fresh = hours <= 6
  const open = OPEN_STATUSES.has(status)

  if (!open) {
    return {
      disposition: 'ARCHIVE_ONLY',
      reason: 'Historical or terminal-status record retained for evidence only.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (matchedSchedule && fresh) {
    return {
      disposition: 'KEEP_ACTIVE',
      reason: 'Fresh scheduled or supporting job preserved as legitimate active work.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (String(job.sourceType || '').toLowerCase() === 'recovery-ledger' && !matchedSchedule) {
    return {
      disposition: 'PURGE_FROM_ACTIVE',
      reason: 'Recovery-ledger residue is not part of legitimate scheduled overnight work.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (PRESERVE_RE.test(text) && fresh) {
    return {
      disposition: 'KEEP_ACTIVE',
      reason: 'Fresh deployment/client-facing work preserved pending human review.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (SAFE_PURGE_RE.test(text)) {
    return {
      disposition: 'PURGE_FROM_ACTIVE',
      reason: 'Task matches stale runtime debris / validation / lock-conflict / recovery-noise purge policy.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (job.lockSession && !fresh) {
    return {
      disposition: 'PURGE_FROM_ACTIVE',
      reason: 'Open job carries stale lock residue beyond fresh-session window.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (hours >= 24) {
    return {
      disposition: 'PURGE_FROM_ACTIVE',
      reason: 'Open job is stale beyond overnight baseline threshold.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  if (matchedSchedule && !fresh) {
    return {
      disposition: 'PURGE_FROM_ACTIVE',
      reason: 'Scheduled-work residue is stale and should be archived before tomorrow baseline.',
      matchedSchedule,
      ageHours: Math.round(hours),
    }
  }

  return {
    disposition: 'NEEDS_REVIEW',
    reason: 'Open job is not clearly scheduled work and is not safely classifiable as purge noise.',
    matchedSchedule,
    ageHours: Math.round(hours),
  }
}

export function classifyRuntimeJobs(jobs = [], options = {}) {
  return (jobs || []).map((job) => ({
    ...job,
    purgeReview: classifyRuntimeJob(job, options),
  }))
}

export function buildPurgeReview({ jobs = [], now = nowIso(), expected = EXPECTED_MORNING_JOBS } = {}) {
  const classifiedJobs = classifyRuntimeJobs(jobs, { now, expected })
  const duplicateGroups = new Map()
  for (const job of classifiedJobs) {
    const status = normalizeStatus(job.status)
    if (!OPEN_STATUSES.has(status)) continue
    const key = `${normalizeText(job.owner || job.agent || job.department || '')}|${normalizeText(job.task || job.title || '')}`
    const list = duplicateGroups.get(key) || []
    list.push(job)
    duplicateGroups.set(key, list)
  }

  for (const jobsForKey of duplicateGroups.values()) {
    if (jobsForKey.length < 2) continue
    jobsForKey.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    for (const job of jobsForKey.slice(1)) {
      job.purgeReview = {
        ...job.purgeReview,
        disposition: 'PURGE_FROM_ACTIVE',
        reason: 'Duplicate open runtime retry superseded by a newer job in the same owner/task lane.',
      }
    }
  }

  const buckets = {
    PURGE_FROM_ACTIVE: [],
    KEEP_ACTIVE: [],
    NEEDS_REVIEW: [],
    ARCHIVE_ONLY: [],
  }

  for (const job of classifiedJobs) {
    buckets[job.purgeReview.disposition].push(job)
  }

  const projectedOpen = [...buckets.KEEP_ACTIVE, ...buckets.NEEDS_REVIEW].filter((job) => OPEN_STATUSES.has(normalizeStatus(job.status)))
  const projectedCounts = {
    ledgerTotal: jobs.length,
    activeWorkTotal: projectedOpen.length,
    queued: projectedOpen.filter((job) => normalizeStatus(job.status) === 'queued').length,
    running: projectedOpen.filter((job) => normalizeStatus(job.status) === 'running').length,
    blocked: projectedOpen.filter((job) => ['blocked', 'failed'].includes(normalizeStatus(job.status))).length,
    stale: projectedOpen.filter((job) => job.purgeReview.ageHours >= 24 || normalizeStatus(job.status) === 'recoverable_stale').length,
    lockConflicts: projectedOpen.filter((job) => /lock conflict/i.test(`${job.task || ''} ${job.title || ''}`) || job.lockSession).length,
  }

  return { classifiedJobs, buckets, projectedCounts }
}

export function archiveManifestForJob(job = {}, reason = '') {
  return {
    jobId: job.jobId || job.id,
    task: job.task || job.title || 'Untitled job',
    owner: job.owner || job.agent || job.department || 'Unknown',
    status: job.status || 'unknown',
    routeStatus: job.routeStatus || null,
    source: job.source || null,
    sourceType: job.sourceType || null,
    updatedAt: job.updatedAt || job.createdAt || null,
    purgeReason: reason,
  }
}

export function applyPurgeToJobs(jobs = [], classifiedJobs = [], now = nowIso()) {
  const byId = new Map(classifiedJobs.map((job) => [String(job.jobId || job.id), job]))
  const purgedJobs = []
  const purgedLocks = []
  const updatedJobs = jobs.map((job) => {
    const id = String(job.jobId || job.id || '')
    const classified = byId.get(id)
    if (!classified) return job
    const disposition = classified.purgeReview?.disposition
    if (disposition !== 'PURGE_FROM_ACTIVE') return job

    const next = {
      ...job,
      status: 'archived',
      routeStatus: 'purged-active-runtime',
      purgeDisposition: disposition,
      purgedAt: now,
      purgeReason: classified.purgeReview.reason,
      completedAt: job.completedAt || now,
      nextAction: 'Purged from active runtime baseline; historical evidence preserved.',
      lockOwner: null,
      lockSession: null,
      lockExpiresAt: null,
      lockReason: null,
      updatedAt: now,
    }
    purgedJobs.push(archiveManifestForJob(next, classified.purgeReview.reason))
    if (job.lockSession || job.lockOwner || job.lockReason) {
      purgedLocks.push({
        jobId: id,
        task: job.task || job.title || 'Untitled job',
        lockOwner: job.lockOwner || null,
        lockSession: job.lockSession || null,
        lockExpiresAt: job.lockExpiresAt || null,
        lockReason: job.lockReason || null,
        purgeReason: classified.purgeReview.reason,
      })
    }
    return next
  })

  return { updatedJobs, purgedJobs, purgedLocks }
}

export function updateMissionStateJobs(stateJobs = [], updatedJobs = [], now = nowIso()) {
  const updatedById = new Map((updatedJobs || []).map((job) => [String(job.jobId || job.id), job]))
  return (stateJobs || []).map((job) => {
    const replacement = updatedById.get(String(job.id || ''))
    if (!replacement) return job
    return {
      ...job,
      status: 'archived',
      routeStatus: 'purged-active-runtime',
      updatedAt: now,
      lockOwner: null,
      lockSession: null,
      lockExpiresAt: null,
      lockReason: null,
    }
  })
}

export function buildSnapshotCounts({ ledger = [], activeWork = {}, registry = {}, blocked = [], stale = [], locks = {}, reconciliation = {} } = {}) {
  return {
    ledgerTotal: Array.isArray(ledger) ? ledger.length : Number(ledger?.count || 0),
    activeWorkTotal: activeWork?.count || 0,
    queued: Array.isArray(registry?.queued) ? registry.queued.length : registry?.counts?.queued || 0,
    running: Array.isArray(registry?.running) ? registry.running.length : registry?.counts?.running || 0,
    blocked: Array.isArray(blocked) ? blocked.length : registry?.counts?.blocked || 0,
    stale: Array.isArray(stale) ? stale.length : reconciliation?.sourceCounts?.stale || 0,
    lockConflicts: Array.isArray(locks?.lockConflicts) ? locks.lockConflicts.length : 0,
  }
}
