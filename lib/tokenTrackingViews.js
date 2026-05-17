import { loadTelemetry } from './tokenTelemetry.js'

function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function classifyTokenCost(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.description || ''}`)
  if (/\b(summary|status|triage|rollup|report draft|draft|queue)\b/.test(text) && !/\b(build|research|analysis|scan)\b/.test(text)) return 'low'
  if (/\b(research|analysis|scan|full report|blog|content|website|app|build|deploy)\b/.test(text)) return 'high'
  return 'medium'
}

function selectedExecutorFor(job = {}) {
  const text = normalizeText(`${job.task || job.title || ''} ${job.description || ''}`)
  if (/\b(summary|status|triage|rollup|report draft|classification)\b/.test(text) && !/\b(security|deploy|production|client facing|financial|legal)\b/.test(text)) return 'local_ai'
  if (/\b(blog|content|article|seo|draft)\b/.test(text)) return 'claude_cli_eligible'
  return 'gpt_codex'
}

export function buildTokenTrackingOverview({ runtimeDir, jobs = [], now = new Date().toISOString() } = {}) {
  const telemetry = loadTelemetry(runtimeDir)
  const session = telemetry.session || {}
  const cooldowns = telemetry.cooldowns?.providers || []
  const assignments = telemetry.modelAssignments?.assignments || []
  const byAgent = new Map()
  const byProviderModel = new Map()

  for (const assignment of assignments) {
    byAgent.set(assignment.agent, {
      agent: assignment.agent,
      provider: assignment.defaultModel?.includes('claude') ? 'anthropic' : assignment.defaultModel?.includes('gpt') ? 'openai' : 'local',
      model: assignment.defaultModel,
      estimatedTokenCost: 0,
      activeJobs: 0,
      cooldownStatus: cooldowns.find((item) => item.model === assignment.defaultModel)?.status || 'available',
    })
  }

  const perJob = jobs.map((job) => {
    const tokenCost = classifyTokenCost(job)
    const selectedExecutor = selectedExecutorFor(job)
    const agent = job.owner || job.agent || job.department || 'Unassigned'
    const estimate = tokenCost === 'high' ? 40000 : tokenCost === 'medium' ? 12000 : 2500
    const agentEntry = byAgent.get(agent) || { agent, provider: selectedExecutor === 'local_ai' ? 'local' : 'openai', model: selectedExecutor, estimatedTokenCost: 0, activeJobs: 0, cooldownStatus: 'unknown' }
    agentEntry.estimatedTokenCost += estimate
    agentEntry.activeJobs += 1
    byAgent.set(agent, agentEntry)
    const provider = selectedExecutor === 'local_ai' ? 'local' : selectedExecutor === 'claude_cli_eligible' ? 'anthropic' : 'openai'
    const model = selectedExecutor === 'claude_cli_eligible' ? 'claude_cli' : selectedExecutor
    const key = `${provider}:${model}`
    const slot = byProviderModel.get(key) || { provider, model, estimatedTokenCost: 0, jobs: 0 }
    slot.estimatedTokenCost += estimate
    slot.jobs += 1
    byProviderModel.set(key, slot)
    return {
      jobId: job.id || job.jobId,
      title: job.task || job.title || 'Untitled mission',
      owner: agent,
      selectedExecutor,
      tokenCost,
      estimatedTokens: estimate,
    }
  })

  const totalEstimated = perJob.reduce((sum, item) => sum + item.estimatedTokens, 0)
  const warnings = []
  if (Number(session.percentUsed || 0) >= 70) warnings.push({ level: 'warning', message: 'Premium token budget is above 70% of the visible session cap.' })
  for (const cd of cooldowns) {
    if (cd.status === 'cooldown') warnings.push({ level: 'cooldown', message: `${cd.provider} is cooling down until approximately ${cd.estimatedResetTime || cd.retryDelaySeconds + 's'}.` })
  }

  return {
    generatedAt: now,
    providerState: cooldowns,
    totals: {
      daily: {
        actualVisibleSessionTokens: session.tokensUsed || 0,
        estimatedOpenJobTokens: totalEstimated,
      },
      weekly: {
        projectedFromDailyActual: (session.tokensUsed || 0) * 7,
        projectedFromDailyEstimate: totalEstimated * 7,
      },
    },
    perAgent: Array.from(byAgent.values()).sort((a, b) => b.estimatedTokenCost - a.estimatedTokenCost),
    perJob,
    perProviderModel: Array.from(byProviderModel.values()).sort((a, b) => b.estimatedTokenCost - a.estimatedTokenCost),
    warnings,
  }
}
