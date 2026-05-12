import fs from 'fs'
import path from 'path'

const TELEMETRY_DIR_NAME = 'telemetry'
const SESSION_FILE = 'current-session.json'
const COOLDOWN_FILE = 'provider-cooldowns.json'
const MODEL_ASSIGNMENTS_FILE = 'model-assignments.json'
const API_KEY_TRACKING_FILE = 'api-key-tracking.json'

function nowIso() {
  return new Date().toISOString()
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

export function getTelemetryPaths(runtimeDir) {
  const dir = path.join(runtimeDir, TELEMETRY_DIR_NAME)
  return {
    dir,
    session: path.join(dir, SESSION_FILE),
    cooldowns: path.join(dir, COOLDOWN_FILE),
    modelAssignments: path.join(dir, MODEL_ASSIGNMENTS_FILE),
    apiKeyTracking: path.join(dir, API_KEY_TRACKING_FILE),
  }
}

function defaultSessionTelemetry() {
  const tokensUsed = 319000
  const tokenCap = 1100000
  const elapsedMinutes = 129
  const tokensPerMinute = tokensUsed / elapsedMinutes
  const tokensRemaining = tokenCap - tokensUsed
  const estimatedMinutesRemaining = tokensRemaining / tokensPerMinute
  return {
    source: 'Hermes shell status line',
    provider: 'OpenAI / ChatGPT',
    model: 'gpt-5.4',
    modelVersion: 'gpt-5.4',
    tokensUsed,
    tokenCap,
    percentUsed: Number(((tokensUsed / tokenCap) * 100).toFixed(2)),
    elapsedMinutes,
    tokensPerMinute: Number(tokensPerMinute.toFixed(2)),
    tokensPerHour: Number((tokensPerMinute * 60).toFixed(2)),
    rollingFiveMinuteTokensPerMinute: Number(tokensPerMinute.toFixed(2)),
    rollingFifteenMinuteTokensPerMinute: Number(tokensPerMinute.toFixed(2)),
    rollingSessionAverageTokensPerMinute: Number(tokensPerMinute.toFixed(2)),
    tokensRemaining,
    estimatedMinutesRemaining: Number(estimatedMinutesRemaining.toFixed(2)),
    estimatedHoursRemaining: Number((estimatedMinutesRemaining / 60).toFixed(2)),
    warningThresholds: {
      fiftyPercent: 550000,
      seventyPercent: 770000,
      eightyFivePercent: 935000,
      ninetyFivePercent: 1045000,
    },
    confidence: 'estimated from visible shell telemetry',
    capturedAt: nowIso(),
    taskType: 'chat/admin',
    department: 'Nettie',
    agent: 'Hermes',
    jobId: null,
    project: 'Mission Control',
    notes: 'Baseline session telemetry captured from the observed Hermes/ChatGPT shell state.',
  }
}

function defaultCooldownTelemetry() {
  return {
    providers: [
      {
        provider: 'openai-codex',
        model: 'gpt-5.4',
        endpoint: 'https://chatgpt.com/backend-api/codex',
        status: 'cooldown',
        errorType: 'HTTP 429 usage_limit_reached',
        planType: 'plus',
        resetsInSeconds: 9850,
        estimatedResetTime: 'approximately 2h 44m',
        retryDelaySeconds: 55,
        localCooldownSeconds: 55,
        providerQuotaResetSeconds: 9850,
        fallbackAttempted: true,
        fallbackProvider: 'claude-code',
        fallbackResult: 'failed/unavailable',
        recommendedAction: 'defer heavy work until provider reset',
        capturedAt: nowIso(),
        confidence: 'estimated from provider-reported cooldown telemetry',
      },
    ],
  }
}

function defaultModelAssignments() {
  return {
    assignments: [
      { agent: 'Nettie', department: 'Nettie', defaultModel: 'gpt-5.4', fallbackModel: 'gpt-4.1-mini', taskOverride: 'admin/routing', costTier: 'medium', notes: 'Routing, assistant, summaries.' },
      { agent: 'Van', department: 'Van', defaultModel: 'gpt-5.4', fallbackModel: 'claude-sonnet', taskOverride: 'coding/build repair', costTier: 'high', notes: 'Technical execution and code repair.' },
      { agent: 'Perry', department: 'Perry', defaultModel: 'gpt-5.4', fallbackModel: 'claude-sonnet', taskOverride: 'security/review', costTier: 'high', notes: 'Security reasoning and review.' },
      { agent: 'Torina', department: 'Torina', defaultModel: 'gpt-5.4', fallbackModel: 'claude-haiku', taskOverride: 'writing/media', costTier: 'medium', notes: 'Content generation and polish.' },
      { agent: 'Dana', department: 'Dana', defaultModel: 'gpt-5.4', fallbackModel: 'gpt-4.1', taskOverride: 'finance/research', costTier: 'high', notes: 'Research and finance analysis.' },
      { agent: 'Icky', department: 'Icky', defaultModel: 'gpt-4.1-mini', fallbackModel: 'gpt-4o-mini', taskOverride: 'admin/docs', costTier: 'low', notes: 'Administrative processing.' },
      { agent: 'Funboy', department: 'Funboy', defaultModel: 'gpt-5.4', fallbackModel: 'gpt-4.1', taskOverride: 'opportunity scan', costTier: 'high', notes: 'Research and signal synthesis.' },
      { agent: 'Rab', department: 'Rab', defaultModel: 'gpt-5.4', fallbackModel: 'gpt-4.1', taskOverride: 'R&D/prototype', costTier: 'high', notes: 'Prototype and concept exploration.' },
      { agent: 'Hermes', department: 'Hermes', defaultModel: 'gpt-5.4', fallbackModel: 'claude-code', taskOverride: 'execution runtime', costTier: 'high', notes: 'Execution layer and tool-driving.' },
    ],
  }
}

function defaultApiKeyTracking() {
  return {
    aliases: [
      {
        alias: 'openai-prod-key',
        provider: 'openai',
        environment: 'future',
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: null,
        actualCost: null,
        notes: 'Template alias only — no raw key stored.',
      },
      {
        alias: 'anthropic-van-key',
        provider: 'anthropic',
        environment: 'future',
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: null,
        actualCost: null,
        notes: 'Template alias only — no raw key stored.',
      },
    ],
  }
}

export function ensureTelemetryFiles(runtimeDir) {
  const paths = getTelemetryPaths(runtimeDir)
  if (!fs.existsSync(paths.session)) writeJson(paths.session, defaultSessionTelemetry())
  if (!fs.existsSync(paths.cooldowns)) writeJson(paths.cooldowns, defaultCooldownTelemetry())
  if (!fs.existsSync(paths.modelAssignments)) writeJson(paths.modelAssignments, defaultModelAssignments())
  if (!fs.existsSync(paths.apiKeyTracking)) writeJson(paths.apiKeyTracking, defaultApiKeyTracking())
  return paths
}

export function loadTelemetry(runtimeDir) {
  const paths = ensureTelemetryFiles(runtimeDir)
  return {
    paths,
    session: readJson(paths.session, defaultSessionTelemetry()),
    cooldowns: readJson(paths.cooldowns, defaultCooldownTelemetry()),
    modelAssignments: readJson(paths.modelAssignments, defaultModelAssignments()),
    apiKeyTracking: readJson(paths.apiKeyTracking, defaultApiKeyTracking()),
  }
}

export function saveSessionTelemetry(runtimeDir, payload = {}) {
  const paths = ensureTelemetryFiles(runtimeDir)
  const current = readJson(paths.session, defaultSessionTelemetry())
  const merged = {
    ...current,
    ...payload,
    capturedAt: payload.capturedAt || nowIso(),
  }
  if (merged.tokensUsed != null && merged.tokenCap != null) {
    const used = Number(merged.tokensUsed)
    const cap = Number(merged.tokenCap)
    if (Number.isFinite(used) && Number.isFinite(cap) && cap > 0) {
      merged.percentUsed = Number(((used / cap) * 100).toFixed(2))
      merged.tokensRemaining = cap - used
      if (Number.isFinite(Number(merged.tokensPerMinute)) && Number(merged.tokensPerMinute) > 0) {
        const mins = merged.tokensRemaining / Number(merged.tokensPerMinute)
        merged.estimatedMinutesRemaining = Number(mins.toFixed(2))
        merged.estimatedHoursRemaining = Number((mins / 60).toFixed(2))
      }
    }
  }
  writeJson(paths.session, merged)
  return merged
}

export function saveCooldownTelemetry(runtimeDir, payload = {}) {
  const paths = ensureTelemetryFiles(runtimeDir)
  const current = readJson(paths.cooldowns, defaultCooldownTelemetry())
  const providers = Array.isArray(payload.providers) ? payload.providers : current.providers
  const next = { ...current, ...payload, providers }
  writeJson(paths.cooldowns, next)
  return next
}
