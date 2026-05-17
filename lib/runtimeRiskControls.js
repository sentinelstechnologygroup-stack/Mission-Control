import { loadTelemetry } from './tokenTelemetry.js'

function normalizeStatus(status = '') {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'in_progress' || s === 'in-progress') return 'running'
  if (s === 'done') return 'complete'
  return s || 'queued'
}

function parseMs(value) {
  const ms = Date.parse(value || '')
  return Number.isFinite(ms) ? ms : null
}

export function paginateItems(items = [], { page = 1, limit = 50 } = {}) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50))
  const safePage = Math.max(1, Number(page) || 1)
  const total = Array.isArray(items) ? items.length : 0
  const pageCount = Math.max(1, Math.ceil(total / safeLimit))
  const start = (safePage - 1) * safeLimit
  return {
    items: (items || []).slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    pageCount,
  }
}

export function buildMemoryPressureView({ ledgerJobs = [], archivedJobs = 0, runtimeState = null } = {}) {
  const statuses = ledgerJobs.reduce((acc, job) => {
    const status = normalizeStatus(job.status)
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})
  return {
    openJobs: ledgerJobs.filter((job) => ['queued', 'running', 'active', 'paused', 'blocked'].includes(normalizeStatus(job.status))).length,
    blockedJobs: ledgerJobs.filter((job) => ['blocked', 'failed'].includes(normalizeStatus(job.status))).length,
    failedJobs: statuses.failed || 0,
    archivedJobs,
    inMemoryLedgerSize: JSON.stringify(ledgerJobs).length,
    runtimeStateSize: runtimeState ? JSON.stringify(runtimeState).length : 0,
  }
}

export function buildExecutorForecast({ runtimeDir, bridgeStatus = {}, now = new Date().toISOString() } = {}) {
  const telemetry = loadTelemetry(runtimeDir)
  const providers = (telemetry.cooldowns?.providers || []).map((provider) => {
    const retrySeconds = Number(provider.retryDelaySeconds ?? provider.localCooldownSeconds ?? 0)
    const resetSeconds = Number(provider.providerQuotaResetSeconds ?? provider.resetsInSeconds ?? 0)
    const capturedMs = parseMs(provider.capturedAt || now) || parseMs(now) || Date.now()
    return {
      provider: provider.provider || bridgeStatus.cooldown?.provider || null,
      model: provider.model || bridgeStatus.cooldown?.model || null,
      status: provider.status || (bridgeStatus.executorCoolingDown ? 'cooldown' : 'ready'),
      cooldownStart: provider.capturedAt || bridgeStatus.cooldown?.startedAt || null,
      resetEta: provider.estimatedResetTime || bridgeStatus.cooldown?.resetEta || null,
      resetsInSeconds: resetSeconds || null,
      last429: provider.errorType ? provider.capturedAt || now : null,
      retryAllowedAt: retrySeconds ? new Date(capturedMs + retrySeconds * 1000).toISOString() : null,
      retryDelaySeconds: retrySeconds || null,
      shortRetryCooldown: retrySeconds ? { seconds: retrySeconds, status: 'wait' } : null,
      quotaResetHorizon: resetSeconds ? { seconds: resetSeconds, eta: provider.estimatedResetTime || null } : null,
      providerUnavailable: provider.status === 'unavailable',
    }
  })
  return {
    generatedAt: now,
    providers,
  }
}

export function buildRestartStateView({ state = {}, jobs = [], workers = [], archivedJobs = 0, now = new Date().toISOString() } = {}) {
  const launchedAtMs = parseMs(state.system?.launchedAt || now) || Date.now()
  const preRestartRunningJobs = jobs
    .filter((job) => ['running', 'active'].includes(normalizeStatus(job.status)))
    .map((job) => {
      const heartbeatMs = parseMs(job.heartbeatAt || job.updatedAt || job.createdAt || '')
      const liveWorker = (workers || []).find((worker) => String(worker.jobId || worker.id || '') === String(job.id || job.jobId || '') && worker.status === 'running')
      let classification = 'manual_review_stale'
      if (liveWorker) classification = 'already_running_elsewhere'
      else if (heartbeatMs && heartbeatMs < launchedAtMs) classification = 'recoverable_stale'
      return {
        jobId: job.id || job.jobId,
        title: job.task || job.title || 'Untitled mission',
        classification,
        lastHeartbeat: job.heartbeatAt || job.updatedAt || null,
      }
    })
  return {
    restartEpoch: state.system?.restartEpoch || 1,
    sessionId: state.system?.sessionId || null,
    launchedAt: state.system?.launchedAt || now,
    preRestartRunningJobs,
    memoryPressure: buildMemoryPressureView({ ledgerJobs: jobs, archivedJobs, runtimeState: state }),
  }
}
