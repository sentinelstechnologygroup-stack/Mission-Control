import fs from 'fs'
import path from 'path'
import { EXPECTED_MORNING_JOBS } from './runtimePurge.js'

const HOLD_IDS = ['healthcare-teams-zoho-message-logging-middleware', 'internal-speculative-middleware']
const HOLD_TITLES = ['Healthcare Teams-to-Zoho Message Logging Middleware', 'Internal Speculative Middleware']
const OLLAMA_PRIMARY = 'qwen2.5-coder:14b'
const OLLAMA_BACKUP = 'deepseek-coder:6.7b'
const OLLAMA_GENERAL = 'mistral:7b'

const readJson = (file, fallback = null) => {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback
  } catch {
    return fallback
  }
}

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
  return file
}

export const ensureOperationalRecoveryRoots = (root) => {
  for (const rel of ['runtime/executor-evidence', 'runtime/project-holds', 'runtime/report-execution-timeline', 'runtime/cooldown-fallback']) {
    fs.mkdirSync(path.join(root, rel), { recursive: true })
  }
}

export const executorEvidencePath = (root) => path.join(root, 'runtime', 'executor-evidence', 'latest-executor-evidence.json')
export const holdRegistryPath = (root) => path.join(root, 'runtime', 'project-holds', 'hold-registry.json')
export const cooldownFallbackPath = (root) => path.join(root, 'runtime', 'cooldown-fallback', 'latest.json')
export const reportTimelinePath = (root) => path.join(root, 'runtime', 'report-execution-timeline', 'timeline.jsonl')

export function appendExecutorEvidence(root, entry = {}) {
  ensureOperationalRecoveryRoots(root)
  const file = executorEvidencePath(root)
  const current = readJson(file, { updatedAt: null, tasks: [] })
  current.updatedAt = new Date().toISOString()
  current.tasks = [{ ...entry, timestamp: entry.timestamp || new Date().toISOString() }, ...(current.tasks || [])].slice(0, 200)
  writeJson(file, current)
  return current
}

export const loadExecutorEvidence = (root) => readJson(executorEvidencePath(root), { updatedAt: null, tasks: [] })

export function buildRoutingPolicy() {
  return {
    localModelsAvailable: true,
    currentPrimaryExecutor: 'ollama',
    gptUsageMode: 'review-escalation',
    localFirstEnabled: true,
    localEligibleTaskTypes: [
      'grep/search audits',
      'file inventory',
      'stale/static data detection',
      'report formatting',
      'docs/protocol drafts',
      'simple tests',
      'non-destructive endpoint scaffolding',
      'jsx cleanup with tests',
      'scheduled report artifact indexing',
      'blog formatting/drafting',
      'ci summary generation',
    ],
    gptOnlyTaskTypes: [
      'architecture decisions',
      'security-sensitive edits',
      'destructive cleanup',
      'production deployment decisions',
      'credential/billing/legal/client-facing actions',
      'final validation',
      'ambiguous high-risk refactors',
    ],
    recentFallbackReasons: [],
    tokenConservationMode: true,
  }
}

export function buildLocalHealth() {
  const exists = fs.existsSync('/usr/local/bin/ollama') || fs.existsSync('/usr/bin/ollama')
  return {
    qwenAvailable: exists,
    qwenModelName: exists ? OLLAMA_PRIMARY : null,
    lastQwenTestAt: new Date().toISOString(),
    lastQwenTestStatus: exists ? 'configured' : 'unavailable',
    localExecutorCommand: exists ? `ollama run ${OLLAMA_PRIMARY}` : 'ollama unavailable',
    localExecutorFailureReason: exists ? null : 'ollama binary unavailable',
    backupLocalModels: exists ? [OLLAMA_BACKUP, OLLAMA_GENERAL] : [],
    fallbackReady: exists,
    tokenConservationMode: true,
  }
}

export const writeCooldownFallback = (root, patch = {}) =>
  writeJson(cooldownFallbackPath(root), {
    gptAvailable: !patch.cooldownDetected,
    cooldownDetected: Boolean(patch.cooldownDetected),
    fallbackExecutor: patch.fallbackExecutor || `ollama:${OLLAMA_PRIMARY}`,
    allowedWorkDuringCooldown:
      patch.allowedWorkDuringCooldown || [
        'report formatting',
        'blog drafting',
        'artifact indexing',
        'audits',
        'docs',
        'queue/report status generation',
      ],
    pausedWorkDuringCooldown:
      patch.pausedWorkDuringCooldown || [
        'high-stakes finance judgment',
        'new strategy decisions',
        'client-facing final approval',
        'production deployment decisions',
      ],
    lastFallbackRun: new Date().toISOString(),
  })

export const loadCooldownFallback = (root) =>
  readJson(cooldownFallbackPath(root), {
    gptAvailable: true,
    cooldownDetected: false,
    fallbackExecutor: `ollama:${OLLAMA_PRIMARY}`,
    allowedWorkDuringCooldown: [],
    pausedWorkDuringCooldown: [],
    lastFallbackRun: null,
  })

export function buildHoldRegistry(root) {
  ensureOperationalRecoveryRoots(root)
  const file = holdRegistryPath(root)
  const existing = readJson(file, { projects: [] })
  if (existing.projects?.length) return existing
  const projects = [
    {
      id: HOLD_IDS[0],
      title: HOLD_TITLES[0],
      owner: 'Icky',
      holdReason: 'Permanent hold until client reactivation',
      holdDate: new Date().toISOString(),
      restartConditions: ['client reactivation', 'explicit Patrick approval'],
      artifactLocations: ['/home/patrick/projects/internal-tools/healthcare-teams-zoho-middleware'],
      preservedRoutes: [],
      preservedSchemas: ['docs/zoho-communications-schema-draft.md'],
      preservedReports: [],
      preservedDependencies: [],
      resumeNotes: 'Preserve architecture and notes; no active execution.',
    },
    {
      id: HOLD_IDS[1],
      title: HOLD_TITLES[1],
      owner: 'Icky',
      holdReason: 'Speculative middleware initiatives paused pending ROI/necessity/demand proof',
      holdDate: new Date().toISOString(),
      restartConditions: ['measurable ROI', 'operational necessity', 'validated market demand'],
      artifactLocations: [
        '/home/patrick/mission-control/governance/middleware-hub-wedge-checklist.md',
        '/home/patrick/mission-control/reports/middleware-hub-architecture-decision-2026-04-26.md',
      ],
      preservedRoutes: [],
      preservedSchemas: [],
      preservedReports: ['reports/middleware-hub-architecture-decision-2026-04-26.md'],
      preservedDependencies: [],
      resumeNotes: 'Do not auto-resume or inflate runtime queues.',
    },
  ]
  writeJson(file, { updatedAt: new Date().toISOString(), projects })
  return readJson(file, { updatedAt: null, projects })
}

export function classifyHoldMatches(jobs = []) {
  return jobs
    .filter((job) => {
      const text = JSON.stringify(job).toLowerCase()
      return HOLD_IDS.some((id) => text.includes(id.replace(/-/g, ' '))) || HOLD_TITLES.some((title) => text.includes(title.toLowerCase()))
    })
    .map((job) => job.id)
}

export function appendReportTimeline(root, event = {}) {
  ensureOperationalRecoveryRoots(root)
  fs.appendFileSync(reportTimelinePath(root), JSON.stringify({ ...event, timestamp: event.timestamp || new Date().toISOString() }) + '\n')
}

export function buildReportExecutionHealth(root, reportsStatus = {}, jobs = []) {
  const scheduledReports = EXPECTED_MORNING_JOBS.map((item) => {
    const match = (reportsStatus.recent || []).find((r) => String(r.title || '').toLowerCase().includes(item.owner.toLowerCase()) || String(r.reportType || '').toLowerCase().includes('digest'))
    const lastSuccessfulRun = match?.updatedAt || null
    const stale = match ? Boolean(match.stale) : true
    return {
      id: item.id,
      name: item.name,
      owner: item.owner,
      scheduleSource: item.scheduleSource,
      lastSuccessfulRun,
      lastFailedRun: null,
      currentlyRunning: jobs.some((j) => (j.owner || j.agent) === item.owner && String(j.status).toLowerCase() === 'running' && item.taskPatterns.some((rx) => rx.test(`${j.task || ''} ${j.title || ''}`))),
      queued: jobs.some((j) => (j.owner || j.agent) === item.owner && String(j.status).toLowerCase() === 'queued' && item.taskPatterns.some((rx) => rx.test(`${j.task || ''} ${j.title || ''}`))),
      stale,
      disabled: item.scheduleSource.startsWith('expected-'),
      degraded: stale || item.scheduleSource.startsWith('expected-'),
    }
  })
  const stale = scheduledReports.filter((r) => r.stale)
  return {
    scheduledReports,
    lastSuccessfulRuns: scheduledReports.filter((r) => r.lastSuccessfulRun).map((r) => ({ id: r.id, at: r.lastSuccessfulRun })),
    lastFailedRuns: [],
    currentlyRunning: scheduledReports.filter((r) => r.currentlyRunning).map((r) => r.id),
    queued: scheduledReports.filter((r) => r.queued).map((r) => r.id),
    stale: stale.map((r) => r.id),
    disabled: scheduledReports.filter((r) => r.disabled).map((r) => r.id),
    degraded: scheduledReports.filter((r) => r.degraded).map((r) => r.id),
    schedulerHealth: stale.length ? 'DEGRADED' : 'LIVE',
    reportPipelineHealth: stale.length ? 'STALE' : 'LIVE',
    truthStatus: stale.length ? 'DEGRADED' : 'LIVE',
  }
}

export function buildTaskOwnership(jobs = []) {
  return {
    activeTasks: jobs
      .filter((j) => !['completed', 'complete', 'cancelled', 'archived'].includes(String(j.status || '').toLowerCase()))
      .slice(0, 100)
      .map((j) => ({
        id: j.id,
        title: j.title || j.task,
        ownerAgent: j.owner || j.agent || 'Unknown',
        executor: j.outputPayload?.executorProvider || j.routeStatus || 'unassigned',
        status: j.status,
        evidenceLink: j.outputPayload?.evidencePath || null,
        localEligible: Boolean(j.inputPayload?.executionLane === 'local_bridge' || String(j.routeStatus || '').includes('local_bridge')),
        localAttempted: Boolean(j.outputPayload?.localModelAttempted),
        gptUsed: Boolean(j.outputPayload?.gptUsed),
        approvalNeeded: Boolean(j.outputPayload?.patrickReviewNeeded || j.outputPayload?.perryReviewRequired),
      })),
  }
}

export function buildStartupHealth({ jobs = [], reportsStatus = {} } = {}) {
  const schedulerRegistered = EXPECTED_MORNING_JOBS.length > 0
  const reportPipelinesRegistered = (reportsStatus.recent || []).length > 0
  const timersActive = schedulerRegistered
  const startupWarnings = []
  if (!reportPipelinesRegistered) startupWarnings.push('No recent report artifacts indexed.')
  return {
    schedulerRegistered,
    workersRegistered: jobs.some((j) => String(j.status).toLowerCase() === 'running'),
    reportPipelinesRegistered,
    timersActive,
    startupComplete: schedulerRegistered,
    startupWarnings,
    startupErrors: [],
    truthStatus: startupWarnings.length ? 'DEGRADED' : 'LIVE',
  }
}
