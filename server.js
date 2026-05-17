import express from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { spawn, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import * as jobStore from './lib/jobStore.js'
import { buildMissionControlData } from './lib/controlPlaneData.js'
import {
  loadAgentRegistry,
  writeAgentRegistry,
  buildAgentRegistryView,
  buildStateAgentSummaries,
  findAgentRecord,
  isAgentAvailabilityQuery,
  buildAgentAvailabilityBrief,
} from './lib/agentRegistry.js'
import {
  loadGovernanceState,
  saveGovernanceState,
  updateGovernanceHeartbeat,
  recordCooldown,
  buildGovernedExecutorStatus,
  evaluateHermesGovernance,
  applyCooldownPauseToJobs,
  recoverPausedProviderBlockedJobs,
  recoverStaleRunningJobs,
  reconcileRecurringRecovery,
  markRecurringRunCompletedLate,
  classifyJobTokenCost,
  isLocalOnlyTask,
} from './lib/runtimeGovernance.js'
import {
  buildActiveWorkView,
  buildRecoveryReconciliationReport,
  saveRecoveryReconciliationReport,
  loadRecoveryReconciliationReport,
  buildRecoveryReconciliationMarkdown,
} from './lib/recoveryReconciliation.js'
import {
  buildQueuePriorities,
  buildTopNextActions,
  buildReconciliationDebtView,
} from './lib/queuePrioritization.js'
import {
  buildDependencyGraph,
  getJobDependencyView,
  buildCooldownBlockedListArtifact,
} from './lib/jobDependencies.js'
import {
  paginateItems,
  buildMemoryPressureView,
  buildExecutorForecast,
  buildRestartStateView,
} from './lib/runtimeRiskControls.js'
import {
  buildObservabilityView,
  buildReconciliationQueuesView,
  buildArchiveCandidatesView,
  buildArchiveCompactionDryRun,
  buildQueueTopologyView,
} from './lib/operationalViews.js'
import {
  getRuntimeContinuityPaths,
  loadRuntimeCheckpoint,
  saveRuntimeCheckpoint,
  buildRuntimeCheckpoint,
  buildSnapshotExport,
  loadRuntimeSummaries,
  saveRuntimeSummaries,
  buildRuntimeSummary,
  applyIncrementalSummary,
  buildCompactContext,
  buildContextEvictionCandidates,
  loadReconciliationSnapshots,
  saveReconciliationSnapshots,
  buildReconciliationSnapshot,
  loadRuntimeEvents,
  loadRuntimeJournal,
  replayRuntimeLedger,
  verifySummaryContinuity,
  buildSummaryDriftReport,
} from './lib/runtimeContinuity.js'
import { saveSessionTelemetry, saveCooldownTelemetry } from './lib/tokenTelemetry.js'
import { registerChatRoutes } from './backend/chat/index.js'
import { registerJobsRoutes } from './backend/jobs/index.js'
import { registerRuntimeRoutes } from './backend/runtime/index.js'
import { registerAgentsRoutes } from './backend/agents/index.js'
import { registerOpsRoutes } from './backend/ops/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = __dirname
const distDir = path.join(root, 'dist')
const runtimeDir = path.join(root, 'runtime')
const workersDir = path.join(runtimeDir, 'workers')
const jobArchiveDir = path.join(runtimeDir, 'job-archives')
const staleJobArchivePath = path.join(jobArchiveDir, 'stale-test-jobs.json')
const statePath = path.join(runtimeDir, 'mission-control-state.json')
const jobsLedgerPath = path.join(runtimeDir, 'jobs.json')
const agentRegistryPath = path.join(runtimeDir, 'agent-registry.json')
const governanceStatePath = path.join(runtimeDir, 'executor-governance.json')
const IRL_STATE_FILE = path.join(runtimeDir, 'irl-state.json')
const nettiePromptPath = path.join(root, 'src', 'persona', 'nettie.system.prompt.md')
const sharedLedgerDir = path.join(root, 'shared-ledger')
const recoveryLedgerJsonPath = path.join(sharedLedgerDir, 'work-recovery-ledger.json')
const recoveryLedgerMdPath = path.join(sharedLedgerDir, 'work-recovery-ledger.md')
const recoveryReconciliationJsonPath = path.join(sharedLedgerDir, 'recovery-reconciliation-report.json')
const recoveryReconciliationMdPath = path.join(sharedLedgerDir, 'recovery-reconciliation-report.md')
const runtimeContinuityPaths = getRuntimeContinuityPaths(runtimeDir)
const { checkpoint: runtimeCheckpointPath, summaries: runtimeSummariesPath, reconciliationSnapshots: reconciliationSnapshotsPath } = runtimeContinuityPaths
const ciRegisterJsonPath = path.join(sharedLedgerDir, 'ci-register.json')
const ciRegisterMdPath = path.join(sharedLedgerDir, 'ci-register.md')
const agentsRoot = '/home/patrick/agents/Mission-Control'

fs.mkdirSync(runtimeDir, { recursive: true })
fs.mkdirSync(workersDir, { recursive: true })
fs.mkdirSync(jobArchiveDir, { recursive: true })
fs.mkdirSync(sharedLedgerDir, { recursive: true })

const localEnvPath = path.join(root, '.env')
function loadLocalEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue
    const index = line.indexOf('=')
    const key = line.slice(0, index).trim()
    if (!key || (process.env[key] !== undefined && process.env[key] !== '')) continue
    let value = line.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadLocalEnvFile(localEnvPath)

const hermesCheck = spawnSync('hermes', ['--version'], { encoding: 'utf8' })
const hermesAvailable = hermesCheck.status === 0
const codexCheck = spawnSync('which', ['codex'], { encoding: 'utf8' })
const codexVersionCheck = codexCheck.status === 0
  ? spawnSync('codex', ['--version'], { encoding: 'utf8' })
  : null
const codexAvailable = codexCheck.status === 0 && codexVersionCheck?.status === 0
const codexVersion = codexAvailable ? String(codexVersionCheck.stdout || codexVersionCheck.stderr || '').trim() : null
const AI_EXECUTION_PROVIDER = String(process.env.AI_EXECUTION_PROVIDER || 'codex').toLowerCase()
const AI_EXECUTION_FALLBACK = String(process.env.AI_EXECUTION_FALLBACK || 'none').toLowerCase()
const LOCAL_EXECUTION_FALLBACK = String(process.env.LOCAL_EXECUTION_FALLBACK || 'ollama/manual').toLowerCase()
const CODEX_EXEC_TIMEOUT_MS = Number(process.env.CODEX_EXEC_TIMEOUT_MS || 120000)
const EXECUTOR_HEALTH_CACHE_MS = Number(process.env.EXECUTOR_HEALTH_CACHE_MS || 120000)
const CODEX_CONNECTED_TEXT = 'CODEX_EXECUTOR_CONNECTED'
const MC_RUNTIME_NAME = String(process.env.MC_RUNTIME_NAME || 'aicenter').trim() || 'aicenter'
const MC_BRIDGE_TOKEN = String(process.env.MC_BRIDGE_TOKEN || '').trim()
const MC_ALLOWED_ORIGINS = new Set(
  String(
    process.env.MC_ALLOWED_ORIGINS
    || 'https://mission-control-livid-zeta.vercel.app,http://127.0.0.1:5173,http://localhost:5173'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
let lastExecutorError = null
let executorHealthCache = null

const nowIso = () => new Date().toISOString()

function getBridgeAuthToken(req) {
  const bearerHeader = String(req.headers.authorization || '').trim()
  const bearerMatch = bearerHeader.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) return bearerMatch[1].trim()

  const directHeader = String(req.headers['x-mc-bridge-token'] || '').trim()
  return directHeader
}

function isBridgeOriginAllowed(origin = '') {
  if (!origin) return false
  if (MC_ALLOWED_ORIGINS.has('*')) return true
  return MC_ALLOWED_ORIGINS.has(origin)
}

function getExecutorQueueDepth() {
  return jobsLedger.filter((job) => {
    const status = String(job?.status || '').toLowerCase()
    const owner = String(job?.owner || job?.agent || '').toLowerCase()
    const source = String(job?.source || '').toLowerCase()
    return ['queued', 'running', 'in_progress', 'paused', 'blocked'].includes(status)
      && (owner === 'hermes' || source === 'nettie')
  }).length
}

function getExecutorLastHeartbeat() {
  const candidates = [
    state?.system?.updatedAt,
    ...((state?.workers || []).flatMap((worker) => [worker?.endedAt, worker?.updatedAt, worker?.startedAt])),
    ...jobsLedger.flatMap((job) => [job?.heartbeatAt, job?.updatedAt, job?.createdAt]),
  ].filter(Boolean)

  if (!candidates.length) return nowIso()
  return candidates.sort().at(-1)
}

function getExecutorCooldownSummary() {
  try {
    const cooldown = buildControlPlaneSnapshot()?.costs?.cooldown
    if (!cooldown || cooldown.cooldownStatus !== 'cooldown') return null
    return {
      provider: cooldown.provider || null,
      model: cooldown.model || null,
      status: cooldown.cooldownStatus,
      estimatedResetTime: cooldown.estimatedResetTime || null,
      retryDelaySeconds: cooldown.retryDelaySeconds ?? null,
      providerQuotaResetSeconds: cooldown.providerQuotaResetSeconds ?? null,
      fallbackAttempted: Boolean(cooldown.fallbackAttempted),
      fallbackResult: cooldown.fallbackResult || null,
    }
  } catch {
    return null
  }
}

function getExecutorFallbackSummary(selectedExecutor = 'none', cooldown = null) {
  const configuredFallback = AI_EXECUTION_FALLBACK !== 'none' ? AI_EXECUTION_FALLBACK : null
  const discoveredFallback = selectedExecutor !== 'hermes' && hermesAvailable ? 'hermes' : null
  const effectiveFallback = configuredFallback || discoveredFallback || null

  if (!effectiveFallback) {
    return {
      available: false,
      executor: null,
      mode: null,
      autoRoutable: false,
      configured: false,
      detail: 'No fallback executor available.',
    }
  }

  const autoRoutable = Boolean(configuredFallback) || (effectiveFallback === 'hermes' && hermesAvailable && Boolean(cooldown))
  const mode = configuredFallback
    ? 'configured'
    : autoRoutable
      ? 'automatic-on-cooldown'
      : 'manual-only'
  const detail = cooldown
    ? `${effectiveFallback} fallback ${autoRoutable ? 'configured' : 'available manually'} while ${selectedExecutor} cools down.`
    : `${effectiveFallback} fallback ${autoRoutable ? 'configured' : 'available manually'}.`

  return {
    available: true,
    executor: effectiveFallback,
    mode,
    autoRoutable,
    configured: Boolean(configuredFallback),
    detail,
  }
}

function buildExecutorBridgeStatus() {
  const selectedExecutor = selectExecutor()
  const cooldown = getExecutorCooldownSummary()
  syncGovernanceStateFromRuntime(cooldown)
  const rawFallback = getExecutorFallbackSummary(selectedExecutor, cooldown)
  const fallback = {
    ...rawFallback,
    autoRoutable: rawFallback.executor === 'hermes' ? false : rawFallback.autoRoutable,
    mode: rawFallback.executor === 'hermes' ? 'manual-only' : rawFallback.mode,
    detail: rawFallback.executor === 'hermes' ? 'Hermes is governed/manual-only for recovery and approved MC execution; not a reliable automatic fallback.' : rawFallback.detail,
  }
  const executorCoolingDown = Boolean(cooldown)
  const executorReady = selectedExecutor !== 'none' && !executorCoolingDown
  const queueView = getQueuePrioritiesView()
  const localAIAvailable = true
  const localWorkActive = Boolean(queueView.counts?.localAIDraftEligible)
  const deepWorkPaused = executorCoolingDown
  const baseStatus = {
    available: selectedExecutor !== 'none',
    bridgeConnected: true,
    bridgeOnline: true,
    runtime: MC_RUNTIME_NAME,
    executor: selectedExecutor === 'none' ? 'unavailable' : selectedExecutor,
    executorReady,
    executorCoolingDown,
    queueDepth: getExecutorQueueDepth(),
    lastHeartbeat: getExecutorLastHeartbeat(),
    cooldown,
    fallback,
    selectedExecutor,
    lastError: lastExecutorError,
    localAIAvailable,
    deepWorkPaused,
    localWorkActive,
    nettieLocalFallback: {
      designed: true,
      conversationalContinuityTarget: true,
      currentMode: executorReady ? 'premium_or_runtime' : 'local_ai_design_path',
      note: 'Local-AI Nettie continuity must answer status, blockers, next actions, and reports without pretending to be deep GPT reasoning.',
    },
  }
  return buildGovernedExecutorStatus(baseStatus, governanceState, { mcRuntimeOnline: true })
}

function resolveNettieConversationExecutor(status = buildExecutorBridgeStatus()) {
  if (status.executorReady && status.selectedExecutor === 'codex') {
    return { executor: 'codex', route: 'primary-ready' }
  }

  if (status.fallback?.available && status.fallback.autoRoutable && status.fallback.executor === 'hermes' && hermesAvailable) {
    return { executor: 'hermes', route: 'fallback-cooldown' }
  }

  if (status.selectedExecutor === 'hermes' && hermesAvailable) {
    return { executor: 'hermes', route: 'primary-hermes' }
  }

  return { executor: 'none', route: 'unavailable' }
}

function buildBridgeExecutionPacket(message = '') {
  return {
    filesCreated: ['none'],
    filesModified: ['none'],
    filesDeleted: ['none'],
    behaviorChanged: `Queued command bridge request for: ${String(message || '').slice(0, 140)}`,
    behaviorUnchanged: 'Mission Control UI, project files, and executor host remain unchanged at queue acceptance time.',
    commandsExecuted: ['Mission Control bridge queue'],
    exitCodes: { 'Mission Control bridge queue': 0 },
    risks: ['none at queue acceptance'],
    nextPhase: 'Dispatch queued bridge job to the active executor runtime.',
  }
}

async function queueBridgeMessageForExecutor(message, requestedExecutor = '') {
  const executor = requestedExecutor || selectExecutor()
  const runtimeBaseUrl = `http://127.0.0.1:${Number(process.env.PORT || 4174)}`
  const response = await fetch(`${runtimeBaseUrl}/api/hermes/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'Nettie',
      type: 'execution',
      executeNow: false,
      executor,
      inputPayload: {
        task: message,
        text: message,
        issuedAt: nowIso(),
        assignedDepartmentHead: 'Dana',
        executionPacket: buildBridgeExecutionPacket(message),
      },
    }),
  })

  const raw = await response.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = { error: 'invalid_executor_response', rawPreview: raw.slice(0, 200) }
  }

  return { ok: response.ok, statusCode: response.status, data }
}

function requireBridgeToken(req, res, next) {
  if (!MC_BRIDGE_TOKEN) {
    return res.status(503).json({ error: 'bridge_token_not_configured', delivered: false, reason: 'bridge_token_not_configured' })
  }

  const token = getBridgeAuthToken(req)
  if (!token) {
    return res.status(401).json({ error: 'missing_bridge_token', delivered: false, reason: 'missing_bridge_token' })
  }

  if (token !== MC_BRIDGE_TOKEN) {
    return res.status(403).json({ error: 'invalid_bridge_token', delivered: false, reason: 'invalid_bridge_token' })
  }

  return next()
}

const NETTIE_PERSONA_DEFAULT = [
  'You are Nettie, Patrick\'s executive assistant and Mission Control command authority.',
  'Hermes is runtime infrastructure only. Never identify as Hermes, GPT, or a generic assistant.',
  'Your job is to interpret Patrick\'s commands, route work to the right agent, create and track jobs, report status, and escalate blockers.',
  'If direct execution is not available, create a real ledger job and report it as queued/awaiting route with a job ID.',
  'Use concise executive language with clear actions and current status.',
].join('\n')

function loadNettiePersona() {
  try {
    if (fs.existsSync(nettiePromptPath)) {
      return fs.readFileSync(nettiePromptPath, 'utf8').trim() || NETTIE_PERSONA_DEFAULT
    }
  } catch (error) {
    console.error('Failed to load Nettie persona file:', error)
  }
  return NETTIE_PERSONA_DEFAULT
}

const NETTIE_PERSONA = loadNettiePersona()

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || ''
const telegramWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || ''
const telegramApiBase = telegramBotToken ? `https://api.telegram.org/bot${telegramBotToken}` : null

const projectRoots = [
  '/home/patrick/apps',
  '/home/patrick/projects',
]
const maxRegistryFiles = 800
const HERMES_ALLOWED_SOURCES = new Set(['Nettie'])
const HERMES_JOB_TYPES = new Set(['image', 'document', 'text', 'execution'])
const HERMES_TERMINAL_STATUSES = new Set(['complete', 'failed'])
const HERMES_ROUTING_RULE = {
  domain: 'routing',
  rule: 'execution-type commands route to selected executor',
  intent: 'executor execution routing',
  behaviorKey: 'chat execution routing',
  action: 'require',
  source: 'system',
}
const OPEN_STATUSES = new Set(['queued', 'running', 'in_progress', 'paused', 'blocked', 'stopping'])
const CLOSED_STATUSES = new Set(['completed', 'complete', 'failed', 'cancelled'])
const TOKEN_OUTAGE_RE = /token\s*outage|rate\s*limit|429|insufficient[_\s-]?quota|quota exceeded|token error/i
const RUNBOOK_VIOLATION_REASON = 'RUNBOOK VIOLATION — REQUIRED ARTIFACTS MISSING'
const GENERIC_SCRIPT_EXECUTION_RUNBOOK = 'GENERIC_SCRIPT_EXECUTION_RUNBOOK.md'
const GENERIC_SCRIPT_REQUIRED_ARTIFACTS = ['INITIAL_SCOPE.md', 'BUILD_PLAN.md', 'ARCHITECTURE_SPEC.md', 'IMPLEMENTATION_SCOPE.json']
const FIREBASE_INFRA_TASK_RE = /\b(firebase|firestore|storage|hosting|functions?|infrastructure)\b|\bauth model\b|\bfirestore schema\b|\benvironment matrix\b|\benv(?:ironment)? setup\b|\bpersistence layer\b/
const EXECUTION_PACKET_REQUIREMENTS = [
  ['filesCreated', ['filesCreated', 'files_created', 'createdFiles', 'files']],
  ['filesModified', ['filesModified', 'files_modified', 'modifiedFiles']],
  ['filesDeleted', ['filesDeleted', 'files_deleted', 'deletedFiles']],
  ['behaviorChanged', ['behaviorChanged', 'behavior_changed']],
  ['behaviorUnchanged', ['behaviorUnchanged', 'behavior_unchanged']],
  ['commandsExecuted', ['commandsExecuted', 'commands_executed', 'commands']],
  ['exitCodes', ['exitCodes', 'exit_codes']],
  ['risks', ['risks', 'knownRisks', 'known_risks']],
  ['nextPhase', ['nextPhase', 'next_phase', 'recommendedNextPhase']],
]
const SAFE_LOCAL_TRANSFORMATION_POLICY = {
  classification: 'SAFE LOCAL TRANSFORMATIONS',
  scope: 'Base44 scrub + Next.js conversion workflows',
  allow: [
    'local project file reads',
    'static code scanning',
    'asset discovery inside project scope',
    'python3 inline scripts for file parsing',
    'regex patterns with escaped characters',
    'string matching against Base44 URLs',
  ],
  blockOnlyIf: [
    'external network calls are made',
    'system-level writes occur outside project scope',
    'destructive commands are detected',
  ],
}
const DEPARTMENT_HEAD_RUNBOOKS = {
  Nettie: ['ROUTING_AND_READINESS_VALIDATION_RUNBOOK.md'],
  Van: [GENERIC_SCRIPT_EXECUTION_RUNBOOK, 'APP_WEBSITE_DELIVERY_RUNBOOK.md', 'FIREBASE_FIRESTORE_SETUP_RUNBOOK.md'],
  Perry: ['SECURITY_QA_GATE_RUNBOOK.md'],
  Torina: ['MEDIA_PACKAGING_AND_MESSAGING_REVIEW_RUNBOOK.md'],
  Scribe: ['ARTICLE_WORKFLOW.md', 'SOURCE_POLICY.md'],
  Dana: ['ROI_PRICING_FINANCIAL_REVIEW_RUNBOOK.md'],
  Icky: ['ADMIN_RECORDS_AND_FOLLOW_THROUGH_RUNBOOK.md'],
  Funboy: ['OPPORTUNITY_SIGNAL_SCAN_AND_BRIEF_RUNBOOK.md'],
  Rab: ['CONCEPT_STRUCTURING_AND_POC_PATH_RUNBOOK.md'],
  Bea: ['INTELLIGENCE_REPORTING_AND_ROLLUP_RUNBOOK.md'],
}

const defaultState = {
  system: {
    name: 'Mission Control',
    mode: 'local',
    host: os.hostname(),
    pid: process.pid,
    launchedAt: nowIso(),
    sessionId: crypto.randomUUID(),
    restartEpoch: 1,
    hermesAvailable,
    codexAvailable,
    codexVersion,
    selectedExecutor: AI_EXECUTION_PROVIDER,
    fallbackExecutor: AI_EXECUTION_FALLBACK,
    hermesMode: 'legacy/manual-only',
    version: 'Local command center bridge',
    updatedAt: nowIso(),
  },
  agents: [
    { id: 'nettie', name: 'Nettie', role: 'Command Coordinator', status: 'active', load: 42, focus: 'routing and approvals' },
    { id: 'van', name: 'Van', role: 'Execution / Build', status: 'active', load: 68, focus: 'delivery and architecture' },
    { id: 'perry', name: 'Perry', role: 'Security / QA', status: 'active', load: 55, focus: 'guardrails and validation' },
    { id: 'torina', name: 'Torina', role: 'Media / Packaging', status: 'active', load: 34, focus: 'story and presentation' },
    { id: 'scribe', name: 'Scribe', role: 'Content Command', status: 'active', load: 22, focus: 'truth-first blogging and SEO packets' },
    { id: 'dana', name: 'Dana', role: 'Finance / ROI', status: 'active', load: 31, focus: 'pricing and economics' },
    { id: 'funboy', name: 'Funboy', role: 'Opportunity Intelligence', status: 'active', load: 46, focus: 'signals and discovery' },
    { id: 'rab', name: 'Rab', role: 'R&D / Experiments', status: 'active', load: 28, focus: 'prototypes and model work' },
    { id: 'bea', name: 'Bea', role: 'Intelligence / Reporting', status: 'active', load: 29, focus: 'reporting and rollups' },
  ],
  jobs: [
    {
      id: 'job-template-cleanup',
      title: 'Remove template dependencies and junk',
      owner: 'Van',
      priority: 'P0',
      stage: 'IN_PROGRESS',
      status: 'running',
      description: 'Strip Base44 SDK/plugin coupling and replace the template shell with Mission Control.',
      workerId: null,
      updatedAt: nowIso(),
    },
    {
      id: 'job-hermes-bridge',
      title: 'Wire Hermes into Mission Control',
      owner: 'Nettie',
      priority: 'P0',
      stage: 'SCOPED',
      status: 'queued',
      description: 'Add a local worker bridge so Mission Control can launch Hermes against jobs.',
      workerId: null,
      updatedAt: nowIso(),
    },
    {
      id: 'job-agent-routing',
      title: 'Control agents through the mission ledger',
      owner: 'Perry',
      priority: 'P1',
      stage: 'SCOPED',
      status: 'queued',
      description: 'Expose the current jobs, agents, and worker state through the control plane.',
      workerId: null,
      updatedAt: nowIso(),
    },
  ],
  workers: [],
  chat: [
    {
      id: crypto.randomUUID(),
      from: 'Nettie',
      role: 'Orchestrator',
      kind: 'briefing',
      text: 'Mission Control is online. I can route work, launch Codex workers, fall back to Hermes, and surface company status. Ask me for a briefing or issue an executive command.',
      ts: nowIso(),
    },
  ],
  logs: [
    { id: crypto.randomUUID(), ts: nowIso(), level: 'info', message: 'Mission Control initialized from local bridge.' },
    { id: crypto.randomUUID(), ts: nowIso(), level: 'info', message: 'Hermes availability check completed.' },
    { id: crypto.randomUUID(), ts: nowIso(), level: 'info', message: 'Codex availability check completed.' },
  ],
}

function readState() {
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, 'utf8')
      const parsed = JSON.parse(raw)
      return {
        ...defaultState,
        ...parsed,
        system: { ...defaultState.system, ...(parsed.system || {}), updatedAt: parsed.system?.updatedAt || nowIso() },
        agents: parsed.agents || defaultState.agents,
        jobs: parsed.jobs || defaultState.jobs,
        workers: parsed.workers || defaultState.workers,
        chat: parsed.chat || defaultState.chat,
        logs: parsed.logs || defaultState.logs,
      }
    }
  } catch (error) {
    console.error('Failed to load state:', error)
  }
  return structuredClone(defaultState)
}

function canonicalDepartmentHeadName(name = '') {
  const raw = String(name || '').trim()
  if (!raw) return ''
  const normalized = raw.toLowerCase()
  if (normalized === 'ivy') return 'Funboy'
  if (normalized === 'funboy') return 'Funboy'
  if (normalized === 'nettie') return 'Nettie'
  if (normalized === 'van') return 'Van'
  if (normalized === 'perry') return 'Perry'
  if (normalized === 'torina') return 'Torina'
  if (normalized === 'scribe') return 'Scribe'
  if (normalized === 'dana') return 'Dana'
  if (normalized === 'icky') return 'Icky'
  if (normalized === 'rab') return 'Rab'
  if (normalized === 'bea') return 'Bea'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function getDepartmentHeadDir(name = '') {
  const canonical = canonicalDepartmentHeadName(name)
  return canonical ? path.join(agentsRoot, canonical) : ''
}

function readTextIfExists(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
  } catch {
    return ''
  }
}

function departmentHeadExists(name = '') {
  const dir = getDepartmentHeadDir(name)
  return Boolean(dir) && fs.existsSync(path.join(dir, 'IDENTITY.md'))
}

function departmentHeadHasOperationalMemory(name = '') {
  const dir = getDepartmentHeadDir(name)
  const text = readTextIfExists(path.join(dir, 'MEMORY.md'))
  if (!text.trim()) return false
  return !/_No active context loaded\._|_No persistent notes\._|_No decisions recorded\._/i.test(text)
}

function departmentHeadHasDefinedOutputFormat(name = '') {
  const dir = getDepartmentHeadDir(name)
  return fs.existsSync(path.join(dir, 'handoffs.md'))
    && fs.existsSync(path.join(dir, 'TASKS.md'))
    && fs.existsSync(path.join(dir, 'rules.md'))
}

function departmentHeadHasQaPath(name = '') {
  if (canonicalDepartmentHeadName(name) === 'Perry') return true
  const dir = getDepartmentHeadDir(name)
  return fs.existsSync(path.join(dir, 'handoffs.md'))
    && fs.existsSync(path.join(agentsRoot, 'Perry', 'SECURITY_QA_GATE_RUNBOOK.md'))
}

function getDepartmentHeadRunbooks(name = '') {
  const canonical = canonicalDepartmentHeadName(name)
  return DEPARTMENT_HEAD_RUNBOOKS[canonical] || []
}

function isGenericScriptTask(name = '', task = '', inputPayload = null) {
  const canonical = canonicalDepartmentHeadName(name)
  if (canonical !== 'Van') return false

  const payload = inputPayload && typeof inputPayload === 'object' ? inputPayload : {}
  const explicitType = normalizeTaskKey(payload.type || payload.taskType || payload.classification?.type || '')
  const explicitDomain = normalizeTaskKey(payload.domain || payload.executionDomain || payload.classification?.domain || '')
  if (explicitType === 'system' && explicitDomain === 'local-execution') return true

  const taskText = String(task || payload.task || payload.text || '').toLowerCase()
  const hasScriptSignals = /\b(sys-\d+|validator|validation|script|cli|fixture|json|deterministic|queue-runner|python3|bash)\b/.test(taskText)
  const hasInfraSignals = FIREBASE_INFRA_TASK_RE.test(taskText)
  const hasWebsiteSignals = /\b(app|website|web\s*app|rebuild|export|hardening|scrub|migration|technical salvage|frontend|backend|api|deploy)\b/.test(taskText)

  return hasScriptSignals && !hasInfraSignals && !hasWebsiteSignals
}

function inferGoverningRunbook(name = '', task = '', inputPayload = null) {
  const canonical = canonicalDepartmentHeadName(name)
  const explicit = inputPayload?.governingRunbook || inputPayload?.runbook || inputPayload?.runbookFile || ''
  if (explicit) return path.basename(String(explicit))

  const taskText = String(task || inputPayload?.task || inputPayload?.text || '').toLowerCase()

  if (canonical === 'Van') {
    if (isGenericScriptTask(canonical, task, inputPayload)) {
      return GENERIC_SCRIPT_EXECUTION_RUNBOOK
    }
    if (FIREBASE_INFRA_TASK_RE.test(taskText)) {
      return 'FIREBASE_FIRESTORE_SETUP_RUNBOOK.md'
    }
    if (/\b(app|website|web\s*app|rebuild|export|hardening|scrub|migration|technical salvage|frontend|backend|api|deploy)\b/.test(taskText)) {
      return 'APP_WEBSITE_DELIVERY_RUNBOOK.md'
    }
  }

  return getDepartmentHeadRunbooks(canonical)[0] || ''
}

function getExecutionPacket(payload = null) {
  if (payload?.executionPacket && typeof payload.executionPacket === 'object') return payload.executionPacket
  return payload && typeof payload === 'object' ? payload : {}
}

function packetFieldHasValue(packet, aliases = []) {
  for (const key of aliases) {
    const value = packet?.[key]
    if (Array.isArray(value) && value.length) return true
    if (typeof value === 'string' && value.trim()) return true
    if (typeof value === 'number') return true
    if (value && typeof value === 'object' && Object.keys(value).length) return true
  }
  return false
}

function validateExecutionPacket(payload = null) {
  const packet = getExecutionPacket(payload)
  const missing = []
  for (const [label, aliases] of EXECUTION_PACKET_REQUIREMENTS) {
    if (!packetFieldHasValue(packet, aliases)) missing.push(label)
  }
  return { ok: missing.length === 0, missing }
}

function slugifyProjectName(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/\.zip$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `project-${crypto.randomUUID().slice(0, 8)}`
}

function extractSourceZipPath(payload = null, task = '') {
  const candidateFields = [
    payload?.sourceZip,
    payload?.zipPath,
    payload?.zip,
    payload?.artifactZip,
    payload?.inputArtifact,
  ].filter(Boolean)

  for (const candidate of candidateFields) {
    const normalized = String(candidate).trim()
    if (/\.zip$/i.test(normalized)) return normalized
  }

  const taskText = String(task || payload?.task || payload?.text || '')
  const match = taskText.match(/([A-Za-z]:\\[^\s"']+\.zip|\/[^\s"']+\.zip)/i)
  return match ? match[1] : ''
}

function inferWebsiteProjectPath(payload = null, task = '') {
  const existing = payload?.projectPath || payload?.artifactRoot || payload?.workspacePath || payload?.basePath || ''
  if (existing) return String(existing)

  const zipPath = extractSourceZipPath(payload, task)
  const baseName = zipPath ? path.basename(zipPath, '.zip') : (payload?.projectName || payload?.project || 'website-export')
  return path.join('/home/patrick/apps', slugifyProjectName(baseName), 'workspace', 'source')
}

function isSafeLocalBase44Transformation(task = '', payload = null, runbook = '') {
  const runbookName = path.basename(String(runbook || payload?.governingRunbook || payload?.runbook || ''))
  if (runbookName !== 'APP_WEBSITE_DELIVERY_RUNBOOK.md') return false

  const owner = canonicalDepartmentHeadName(payload?.assignedDepartmentHead || payload?.assignedAgent || payload?.owner || '')
  if (owner && owner !== 'Van') return false

  const text = String(task || payload?.task || payload?.text || '').toLowerCase()
  return /base44|next\.js|nextjs|export scrub|scrub|conversion|convert|image scan|image localization|asset discovery/.test(text)
}

function applySafeLocalTransformationPolicy(payload = null, task = '', runbook = '') {
  if (!payload || typeof payload !== 'object') return payload
  if (!isSafeLocalBase44Transformation(task, payload, runbook)) return payload

  payload.securityClassification = SAFE_LOCAL_TRANSFORMATION_POLICY.classification
  payload.securityPolicy = {
    ...(payload.securityPolicy || {}),
    safeLocalTransformation: true,
    policyScope: SAFE_LOCAL_TRANSFORMATION_POLICY.scope,
    allow: [...SAFE_LOCAL_TRANSFORMATION_POLICY.allow],
    blockOnlyIf: [...SAFE_LOCAL_TRANSFORMATION_POLICY.blockOnlyIf],
    noInteractiveApprovalRequired: true,
  }
  payload.perryGuidance = {
    ...(payload.perryGuidance || {}),
    midExecutionInterruptions: 'Do not interrupt Van for local file reads, static code scanning, or asset discovery inside project scope.',
    allowedRegexUse: 'Escaped regex patterns for Base44 URL detection are approved when scanning local files only.',
    allowedPythonUse: 'python3 inline parsing scripts are approved for local file parsing when no external execution or shell injection risk exists.',
  }

  const packet = getExecutionPacket(payload)
  const existingRisks = Array.isArray(packet.risks)
    ? packet.risks.map((entry) => String(entry))
    : packet.risks ? [String(packet.risks)] : []
  const safeRiskNote = 'Perry policy: treat Base44 scrub + Next.js conversion as a SAFE LOCAL TRANSFORMATION unless external network calls, out-of-scope writes, or destructive commands appear.'
  if (!existingRisks.includes(safeRiskNote)) existingRisks.unshift(safeRiskNote)

  payload.executionPacket = {
    ...packet,
    risks: existingRisks,
    nextPhase: packet.nextPhase || 'Proceed through Van → Perry → Torina without interactive interruption for safe local scanning operations.',
  }

  return payload
}

function ensureAutoWebsiteArtifacts(payload = null, task = '', runbook = '') {
  if (!payload || typeof payload !== 'object') return payload
  applySafeLocalTransformationPolicy(payload, task, runbook)
  if (path.basename(String(runbook || '')) !== 'APP_WEBSITE_DELIVERY_RUNBOOK.md') return payload

  const taskText = String(task || payload.task || payload.text || '').toLowerCase()
  if (!/\b(export|scrub|next\.js|nextjs|website|web\s*site|migration|conversion|frontend)\b/.test(taskText)) return payload

  const projectPath = inferWebsiteProjectPath(payload, task)
  fs.mkdirSync(projectPath, { recursive: true })

  const zipPath = extractSourceZipPath(payload, task)
  if (zipPath && fs.existsSync(zipPath)) {
    try {
      const hasVisibleFiles = fs.readdirSync(projectPath).some((entry) => !entry.startsWith('.'))
      if (!hasVisibleFiles) {
        spawnSync('unzip', ['-oq', zipPath, '-d', projectPath], { stdio: 'ignore' })
      }
    } catch {}
  }

  const projectName = payload.projectName || payload.project || path.basename(projectPath)
  const requiredArtifacts = ['INITIAL_SCOPE.md', 'BUILD_PLAN.md', 'ARCHITECTURE_SPEC.md', 'IMPLEMENTATION_SCOPE.json']
  const docs = {
    'INITIAL_SCOPE.md': [
      '# INITIAL_SCOPE',
      '',
      `Project: ${projectName}`,
      `Project Path: ${projectPath}`,
      zipPath ? `Source ZIP: ${zipPath}` : 'Source ZIP: provided in instruction packet',
      '',
      'Objective',
      '- Convert the submitted website export into a clean Next.js App Router site without redesigning the public experience.',
      '',
      'Locked requirements',
      '- Preserve the current visual direction, content, layout intent, and public route coverage.',
      '- Remove obsolete builder/runtime scaffolding and legacy entrypoints.',
      '- Localize remote image assets into public/images.',
      '- Fix hero image zoom/crop issues and validate a successful build plus local preview.',
      '- Treat Base44 scrub scanning as a SAFE LOCAL TRANSFORMATION: allow local regex/file parsing without interactive security interruption unless external network calls, out-of-scope writes, or destructive commands appear.',
    ].join('\n'),
      'BUILD_PLAN.md': [
      '# BUILD_PLAN',
      '',
      '1. Inspect routes, shared components, runtime scaffolding, and remote assets.',
      '2. Convert the app to Next.js App Router structure.',
      '3. Remove obsolete builder/runtime files and packages.',
      '4. Localize images and repair responsive hero behavior.',
      '5. Run install/build/lint checks and start local preview.',
      '6. Prepare QA handoff and Patrick completion summary.',
    ].join('\n'),
    'ARCHITECTURE_SPEC.md': [
      '# ARCHITECTURE_SPEC',
      '',
      'Target runtime',
      '- Next.js App Router',
      '- Tailwind styling preserved',
      '- File-based routing under src/app',
      '- Localized assets under public/images',
      '',
      'Migration rules',
      '- Keep public-facing content and route intent intact.',
      '- Replace prior router/location utilities with Next equivalents.',
      '- Keep contact handling static or mailto-safe unless a real endpoint exists.',
    ].join('\n'),
    'IMPLEMENTATION_SCOPE.json': JSON.stringify({
      projectName,
      projectPath,
      sourceZip: zipPath || null,
      owner: payload.assignedDepartmentHead || 'Van',
      runbook: 'APP_WEBSITE_DELIVERY_RUNBOOK.md',
      conversionType: 'export-scrub-nextjs-app-router',
      preserveDesign: true,
      requiredArtifacts,
    }, null, 2),
  }

  for (const artifact of requiredArtifacts) {
    const artifactPath = path.join(projectPath, artifact)
    if (!fs.existsSync(artifactPath)) fs.writeFileSync(artifactPath, docs[artifact])
  }

  payload.projectPath = projectPath
  payload.requiredArtifacts = requiredArtifacts
  payload.executionPacket = {
    filesCreated: requiredArtifacts,
    filesModified: payload.executionPacket?.filesModified || [],
    filesDeleted: payload.executionPacket?.filesDeleted || [],
    behaviorChanged: payload.executionPacket?.behaviorChanged || 'Runbook artifacts were auto-generated from the submitted website-export instruction packet.',
    behaviorUnchanged: payload.executionPacket?.behaviorUnchanged || 'Public design direction, route coverage, and business content remain locked to the provided export unless repair is required.',
    commandsExecuted: payload.executionPacket?.commandsExecuted || ['auto-artifact-generation'],
    exitCodes: payload.executionPacket?.exitCodes || { 'auto-artifact-generation': 0 },
    risks: payload.executionPacket?.risks || ['Implementation/build validation pending execution.'],
    nextPhase: payload.executionPacket?.nextPhase || 'Proceed to website conversion and QA.',
  }
  if (zipPath && !payload.sourceZip) payload.sourceZip = zipPath
  if (!payload.projectName) payload.projectName = projectName
  return payload
}

function inferGenericScriptProjectPath(payload = null, task = '') {
  const existing = payload?.projectPath || payload?.artifactRoot || payload?.workspacePath || payload?.basePath || ''
  if (existing) return String(existing)

  const taskText = String(task || payload?.task || payload?.text || '')
  const sysMatch = taskText.match(/\b(SYS-\d+)\b/i)
  if (sysMatch) return path.join(root, 'artifacts', sysMatch[1].toUpperCase())

  return ''
}

function applyGenericScriptExecutionProfile(payload = null, task = '', runbook = '') {
  if (!payload || typeof payload !== 'object') return payload
  if (path.basename(String(runbook || '')) !== GENERIC_SCRIPT_EXECUTION_RUNBOOK) return payload

  const projectPath = inferGenericScriptProjectPath(payload, task)
  if (projectPath) payload.projectPath = projectPath

  payload.type = 'system'
  payload.domain = 'local_execution'
  payload.classification = {
    ...(payload.classification || {}),
    type: 'system',
    domain: 'local_execution',
    runbook: GENERIC_SCRIPT_EXECUTION_RUNBOOK,
  }
  payload.requiredArtifacts = Array.isArray(payload.requiredArtifacts) && payload.requiredArtifacts.length
    ? payload.requiredArtifacts
    : [...GENERIC_SCRIPT_REQUIRED_ARTIFACTS]

  const implementationScopePath = projectPath ? path.join(projectPath, 'IMPLEMENTATION_SCOPE.json') : ''
  if (implementationScopePath && fs.existsSync(implementationScopePath)) {
    try {
      const implementationScope = JSON.parse(fs.readFileSync(implementationScopePath, 'utf8'))
      payload.executionPacket = {
        filesCreated: implementationScope.filesCreated || payload.executionPacket?.filesCreated || [],
        filesModified: implementationScope.filesModified || payload.executionPacket?.filesModified || [],
        filesDeleted: implementationScope.filesDeleted || payload.executionPacket?.filesDeleted || [],
        behaviorChanged: implementationScope.behaviorChanged || payload.executionPacket?.behaviorChanged || [],
        behaviorUnchanged: implementationScope.behaviorUnchanged || payload.executionPacket?.behaviorUnchanged || [],
        commandsExecuted: implementationScope.commandsExecuted || payload.executionPacket?.commandsExecuted || [],
        exitCodes: implementationScope.exitCodes || payload.executionPacket?.exitCodes || {},
        risks: implementationScope.risks || payload.executionPacket?.risks || [],
        nextPhase: implementationScope.nextPhase || payload.executionPacket?.nextPhase || '',
      }
    } catch {}
  }

  return payload
}

function inferRequiredArtifacts(agentName = '', runbook = '', task = '', inputPayload = null) {
  const payload = inputPayload && typeof inputPayload === 'object' ? inputPayload : {}
  if (Array.isArray(payload.requiredArtifacts) && payload.requiredArtifacts.length) {
    return payload.requiredArtifacts.map((entry) => String(entry).trim()).filter(Boolean)
  }

  const canonical = canonicalDepartmentHeadName(agentName)
  const runbookName = path.basename(String(runbook || ''))
  const taskText = String(task || payload.task || payload.text || '').toLowerCase()

  if (canonical === 'Van' && runbookName === GENERIC_SCRIPT_EXECUTION_RUNBOOK) {
    return [...GENERIC_SCRIPT_REQUIRED_ARTIFACTS]
  }

  if (canonical === 'Van' && (runbookName === 'FIREBASE_FIRESTORE_SETUP_RUNBOOK.md' || FIREBASE_INFRA_TASK_RE.test(taskText))) {
    return ['FIREBASE_PROJECT_MAP.md', 'AUTH_MODEL.md', 'FIRESTORE_SCHEMA.md', 'ENVIRONMENT_MATRIX.md']
  }

  if (canonical === 'Van' && (runbookName === 'APP_WEBSITE_DELIVERY_RUNBOOK.md' || /\b(app|website|web\s*app|rebuild|export|hardening|scrub|migration|technical salvage|frontend|backend|api|deploy)\b/.test(taskText))) {
    return ['INITIAL_SCOPE.md', 'BUILD_PLAN.md', 'ARCHITECTURE_SPEC.md', 'IMPLEMENTATION_SCOPE.json']
  }

  return []
}

function validateRequiredArtifacts(agentName = '', runbook = '', task = '', inputPayload = null) {
  const payload = inputPayload && typeof inputPayload === 'object' ? inputPayload : {}
  const requiredArtifacts = inferRequiredArtifacts(agentName, runbook, task, payload)
  const projectPath = payload.projectPath || payload.artifactRoot || payload.workspacePath || payload.basePath || ''
  const missing = []

  if (requiredArtifacts.length && !projectPath) {
    return {
      requiredArtifacts,
      missing: ['projectPath', ...requiredArtifacts],
    }
  }

  for (const artifact of requiredArtifacts) {
    if (!fs.existsSync(path.join(projectPath, artifact))) missing.push(artifact)
  }

  return { requiredArtifacts, missing }
}

function validateDepartmentHeadRoutingReadiness(agentName = '', task = '', inputPayload = null) {
  const canonical = canonicalDepartmentHeadName(agentName)
  const missing = []
  const governingRunbook = inferGoverningRunbook(canonical, task, inputPayload)
  const dir = getDepartmentHeadDir(canonical)

  if (!departmentHeadExists(canonical)) missing.push('department_head_missing')
  if (!departmentHeadHasOperationalMemory(canonical)) missing.push('operational_memory_missing')
  if (!governingRunbook) missing.push('runbook_missing')
  if (governingRunbook && !fs.existsSync(path.join(dir, governingRunbook))) missing.push(`runbook_file_missing:${governingRunbook}`)
  if (!departmentHeadHasDefinedOutputFormat(canonical)) missing.push('output_format_missing')
  if (!departmentHeadHasQaPath(canonical)) missing.push('qa_path_missing')

  return {
    ok: missing.length === 0,
    canonical,
    governingRunbook,
    missing,
  }
}

function validateHermesExecutionRequest(inputPayload = null, fallbackAgent = '') {
  const payload = inputPayload && typeof inputPayload === 'object' ? inputPayload : {}
  const task = String(payload.task || payload.text || '')
  const assignedDepartmentHead = canonicalDepartmentHeadName(
    payload.assignedDepartmentHead || payload.assignedAgent || payload.owner || fallbackAgent || extractAgent(task)
  )
  const governingRunbook = inferGoverningRunbook(assignedDepartmentHead, task, payload)
  applyGenericScriptExecutionProfile(payload, task, governingRunbook)
  applySafeLocalTransformationPolicy(payload, task, governingRunbook)
  const packetValidation = path.basename(String(governingRunbook || '')) === GENERIC_SCRIPT_EXECUTION_RUNBOOK
    ? { ok: true, missing: [] }
    : validateExecutionPacket(payload)
  const artifactValidation = validateRequiredArtifacts(assignedDepartmentHead, governingRunbook, task, payload)
  const missingArtifacts = []

  if (!assignedDepartmentHead || !departmentHeadExists(assignedDepartmentHead)) missingArtifacts.push('assignedDepartmentHead')
  if (!governingRunbook) missingArtifacts.push('governingRunbook')
  else if (!fs.existsSync(path.join(getDepartmentHeadDir(assignedDepartmentHead), governingRunbook))) missingArtifacts.push(`governingRunbook:${governingRunbook}`)
  missingArtifacts.push(...artifactValidation.missing)
  missingArtifacts.push(...packetValidation.missing)

  return {
    ok: missingArtifacts.length === 0,
    assignedDepartmentHead,
    governingRunbook,
    requiredArtifacts: artifactValidation.requiredArtifacts,
    missingArtifacts: [...new Set(missingArtifacts)],
  }
}

function makeRunbookViolationResult(validation = {}) {
  return {
    error: RUNBOOK_VIOLATION_REASON,
    reason: RUNBOOK_VIOLATION_REASON,
    assignedDepartmentHead: validation.assignedDepartmentHead || null,
    governingRunbook: validation.governingRunbook || 'missing',
    missingArtifacts: validation.missingArtifacts || [],
    requiredArtifacts: validation.requiredArtifacts || [],
  }
}

function createDocumentationLockJob(agentName, task, missing, source = 'mission-control') {
  const canonical = canonicalDepartmentHeadName(agentName)
  const docsTask = `Create/update operational memory and runbook packet for ${canonical} before routing: ${task}`
  const createdAt = nowIso()
  const ledgerJob = saveJob({
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    agent: 'Nettie',
    task: docsTask,
    status: 'queued',
    routeStatus: 'documentation-required',
    source,
    inputPayload: {
      assignedDepartmentHead: canonical,
      originalTask: task,
      missingReadiness: missing,
    },
    createdAt,
    updatedAt: createdAt,
  })

  const missionJob = createMissionStateJob({
    id: ledgerJob.id,
    task: docsTask,
    owner: 'Nettie',
    description: `Routing lock for ${canonical}: ${missing.join(', ')}`,
    status: 'queued',
    routeStatus: 'documentation-required',
    priority: 'P0',
  })

  return { ledgerJob, missionJob }
}

let state = readState()
state.system = {
  ...state.system,
  pid: process.pid,
  launchedAt: nowIso(),
  sessionId: crypto.randomUUID(),
  restartEpoch: Number(state.system?.restartEpoch || 0) + 1,
}
let agentRegistry = loadAgentRegistry(agentRegistryPath, { nowIso: nowIso(), legacyAgents: state.agents || [] })
let governanceState = loadGovernanceState(governanceStatePath, state.system)
let recoveryReconciliationReport = loadRecoveryReconciliationReport(recoveryReconciliationJsonPath)
let runtimeCheckpoint = loadRuntimeCheckpoint(runtimeCheckpointPath)
let runtimeSummaries = loadRuntimeSummaries(runtimeSummariesPath)
let reconciliationSnapshots = loadReconciliationSnapshots(reconciliationSnapshotsPath)
const runningWorkers = new Map()

// ===========================================================
// EXECUTION LEDGER — persistent jobs.json
// ===========================================================
function loadJobsLedger() {
  try {
    if (fs.existsSync(jobsLedgerPath)) return JSON.parse(fs.readFileSync(jobsLedgerPath, 'utf8'))
  } catch (e) { console.error('[LEDGER_LOAD_ERR]', e.message) }
  return []
}

let jobsLedger = loadJobsLedger()
if (!Array.isArray(jobsLedger)) jobsLedger = []
jobsLedger = jobsLedger.map((job) => normalizeLedgerJob(job))
saveJobsLedger()

function getAgentRegistryView() {
  const selectedExecutor = selectExecutor()
  const fallback = getExecutorFallbackSummary(selectedExecutor, null)
  const executorStatus = {
    available: selectedExecutor !== 'none',
    bridgeConnected: true,
    executorReady: false,
    executorCoolingDown: false,
    fallback,
    selectedExecutor,
  }

  return buildAgentRegistryView({
    registry: agentRegistry,
    jobs: jobStore.deriveLedgerView(),
    systemState: state.system,
    executorStatus,
    nowIso: nowIso(),
    hermesAvailable,
    selectedExecutor: AI_EXECUTION_PROVIDER,
    fallbackExecutor: AI_EXECUTION_FALLBACK,
  })
}

function syncAgentRegistryState() {
  const view = getAgentRegistryView()
  agentRegistry = view
  state.agents = buildStateAgentSummaries(view)
  writeAgentRegistry(agentRegistryPath, view)
  return view
}

function hasReliableFallback() {
  return Boolean(governanceState?.claude_cli?.reliable)
}

function persistGovernance() {
  saveGovernanceState(governanceStatePath, governanceState)
}

function getRecoveryReconciliationReport() {
  return recoveryReconciliationReport || loadRecoveryReconciliationReport(recoveryReconciliationJsonPath)
}

function persistRecoveryReconciliationReport(report) {
  recoveryReconciliationReport = report
  saveRecoveryReconciliationReport(recoveryReconciliationJsonPath, report)
  fs.writeFileSync(recoveryReconciliationMdPath, buildRecoveryReconciliationMarkdown(report))
  return report
}

function buildAndPersistRecoveryReconciliationReport() {
  const registry = buildMasterWorkRegistry()
  const report = buildRecoveryReconciliationReport({
    ledgerJobs: jobStore.deriveLedgerView(),
    registry,
    runtimeJobs: state.jobs || [],
    workers: state.workers || [],
    governanceState,
    now: nowIso(),
  })
  return persistRecoveryReconciliationReport(report)
}

function getQueuePrioritiesView() {
  const registry = buildMasterWorkRegistry()
  const recoveryReport = getRecoveryReconciliationReport() || buildAndPersistRecoveryReconciliationReport()
  const dependencyGraph = getDependencyGraphView()
  return buildQueuePriorities({
    registry,
    recoveryReport,
    dependencyGraph,
    claudeValidated: Boolean(governanceState?.claude_cli?.reliable),
    now: nowIso(),
  })
}

function getTopNextActionsView(limit = 10) {
  const queue = getQueuePrioritiesView()
  return buildTopNextActions(queue.priorities, { limit })
}

function getDependencyGraphView() {
  return buildDependencyGraph({
    jobs: jobStore.deriveLedgerView(),
    now: nowIso(),
  })
}

function getJobDependencyDetail(jobId = '') {
  return getJobDependencyView(getDependencyGraphView(), jobId)
}

function getCooldownBlockedListArtifactView() {
  const queue = getQueuePrioritiesView()
  const dependencyGraph = getDependencyGraphView()
  const recoveryReport = getRecoveryReconciliationReport() || buildAndPersistRecoveryReconciliationReport()
  return buildCooldownBlockedListArtifact({
    queuePriorities: queue,
    dependencyGraph,
    recoveryReport,
    now: nowIso(),
  })
}

function getReconciliationDebtView() {
  const recoveryReport = getRecoveryReconciliationReport() || buildAndPersistRecoveryReconciliationReport()
  const queue = getQueuePrioritiesView()
  return buildReconciliationDebtView({ recoveryReport, queuePriorities: queue, now: nowIso() })
}

function getExecutorForecastView() {
  return buildExecutorForecast({ runtimeDir, bridgeStatus: buildExecutorBridgeStatus(), now: nowIso() })
}

function getRestartStateView() {
  return buildRestartStateView({
    state,
    jobs: jobStore.deriveLedgerView(),
    workers: state.workers || [],
    archivedJobs: loadStaleJobArchive().length,
    now: nowIso(),
  })
}

function getObservabilityView() {
  return buildObservabilityView({
    platformHealth: buildPlatformHealth(),
    executorStatus: buildExecutorBridgeStatus(),
    queuePriorities: getQueuePrioritiesView(),
    reconciliationDebt: getReconciliationDebtView(),
    dependencyGraph: getDependencyGraphView(),
    restartState: getRestartStateView(),
    workers: state.workers || [],
    now: nowIso(),
  })
}

function getReconciliationQueuesView() {
  return buildReconciliationQueuesView({
    queuePriorities: getQueuePrioritiesView(),
    reconciliationDebt: getReconciliationDebtView(),
    now: nowIso(),
  })
}

function getArchiveCandidatesView() {
  return buildArchiveCandidatesView({
    ledgerJobs: jobStore.deriveLedgerView(),
    staleArchive: loadStaleJobArchive(),
    now: nowIso(),
  })
}

function getArchiveCompactionDryRunView() {
  return buildArchiveCompactionDryRun({
    ledgerJobs: jobStore.deriveLedgerView(),
    staleArchive: loadStaleJobArchive(),
    now: nowIso(),
  })
}

function getQueueTopologyView() {
  return buildQueueTopologyView({
    dependencyGraph: getDependencyGraphView(),
    queuePriorities: getQueuePrioritiesView(),
    now: nowIso(),
  })
}

function getRuntimeSnapshotInputs() {
  const queuePriorities = getQueuePrioritiesView()
  const dependencyGraph = getDependencyGraphView()
  const reconciliationQueues = getReconciliationQueuesView()
  const executorForecast = getExecutorForecastView()
  const observability = getObservabilityView()
  const nextActions = getTopNextActionsView()
  const reconciliationDebt = getReconciliationDebtView()
  const queueTopology = getQueueTopologyView()
  const archiveCandidates = getArchiveCandidatesView()
  const restartState = getRestartStateView()
  return {
    queuePriorities,
    dependencyGraph,
    reconciliationQueues,
    executorForecast,
    observability,
    nextActions,
    reconciliationDebt,
    queueTopology,
    archiveCandidates,
    restartState,
  }
}

function getRuntimeCheckpointView() {
  return buildRuntimeCheckpoint({
    state,
    ...getRuntimeSnapshotInputs(),
    now: nowIso(),
  })
}

function persistRuntimeCheckpoint() {
  runtimeCheckpoint = saveRuntimeCheckpoint(runtimeCheckpointPath, getRuntimeCheckpointView())
  return runtimeCheckpoint
}

function getRuntimeSnapshotExportView() {
  const inputs = getRuntimeSnapshotInputs()
  const checkpoint = runtimeCheckpoint || getRuntimeCheckpointView()
  return buildSnapshotExport({
    observability: inputs.observability,
    queueTopology: inputs.queueTopology,
    recoveryState: {
      reconciliationQueues: inputs.reconciliationQueues,
      debt: inputs.reconciliationDebt,
      cooldownBlockedList: getCooldownBlockedListArtifactView(),
    },
    budgetState: inputs.executorForecast,
    executorState: buildExecutorBridgeStatus(),
    reconciliationDebt: inputs.reconciliationDebt,
    archiveCandidates: inputs.archiveCandidates,
    factoryPipelineState: {
      phase: 'runtime_foundation',
      intakeAvailable: false,
      pipelineCount: 0,
    },
    checkpoint,
    now: nowIso(),
  })
}

function buildRuntimeSummaryPayload(type = 'manual') {
  const inputs = getRuntimeSnapshotInputs()
  const replay = replayRuntimeLedger(runtimeContinuityPaths)
  const drift = buildSummaryDriftReport({ summariesStore: runtimeSummaries })
  const snapshot = {
    queuePriorities: inputs.queuePriorities,
    reconciliationQueues: inputs.reconciliationQueues,
    nextActions: inputs.nextActions,
    dependencySummary: inputs.queueTopology,
    blocked: (inputs.reconciliationDebt.topBlockers || []).map((item) => item.title || item.jobId),
    failures: (inputs.queuePriorities.priorities || []).filter((job) => String(job.currentStatus || '').toLowerCase() === 'failed').slice(0, 10).map((job) => job.title),
    shippedWork: [],
    risks: [
      inputs.observability.executorState?.coolingDown ? 'premium executor cooling down' : null,
      inputs.reconciliationDebt.reconciliationDebtScore > 0 ? 'reconciliation debt remains unresolved' : null,
      inputs.queueTopology.orphanChains?.length ? 'orphan dependency chains detected' : null,
      drift.driftRiskScore > 0 ? 'summary drift risk elevated' : null,
    ].filter(Boolean),
    decisions: [],
    confidence: inputs.observability.bridgeOnline ? 'operational' : 'degraded',
  }
  return buildRuntimeSummary({
    type,
    previous: runtimeSummaries.summaries?.slice(-1)[0] || null,
    sourceEventCount: replay.eventCount,
    generatedBy: buildExecutorBridgeStatus().localAIAvailable ? 'mission-control-local-ai' : 'mission-control',
    now: nowIso(),
    snapshot,
  })
}

function createRuntimeSummary(type = 'manual') {
  const summary = buildRuntimeSummaryPayload(type)
  runtimeSummaries = applyIncrementalSummary({ store: runtimeSummaries, summary })
  saveRuntimeSummaries(runtimeSummariesPath, runtimeSummaries)
  return summary
}

function listRuntimeSummaries() {
  return runtimeSummaries.summaries || []
}

function getLatestRuntimeSummary() {
  const summaries = listRuntimeSummaries()
  return summaries.length ? summaries[summaries.length - 1] : null
}

function getRuntimeSummaryById(summaryId = '') {
  return listRuntimeSummaries().find((item) => item.summaryId === summaryId) || null
}

function getCompactContextView(agent = 'nettie') {
  return buildCompactContext({
    agent,
    latestSummary: getLatestRuntimeSummary(),
    queuePriorities: getQueuePrioritiesView(),
    dependencyGraph: getDependencyGraphView(),
    reconciliationQueues: getReconciliationQueuesView(),
    now: nowIso(),
  })
}

function getContextEvictionCandidatesView() {
  return buildContextEvictionCandidates({
    summariesStore: runtimeSummaries,
    chat: state.chat || [],
    logs: state.logs || [],
    jobs: jobStore.deriveLedgerView(),
    now: nowIso(),
  })
}

function createReconciliationSnapshot() {
  const snapshot = buildReconciliationSnapshot({
    reconciliationDebt: getReconciliationDebtView(),
    reconciliationQueues: getReconciliationQueuesView(),
    dependencyGraph: getDependencyGraphView(),
    previous: reconciliationSnapshots.snapshots?.slice(-1)[0] || null,
    now: nowIso(),
  })
  reconciliationSnapshots = { snapshots: [...(reconciliationSnapshots.snapshots || []), snapshot] }
  saveReconciliationSnapshots(reconciliationSnapshotsPath, reconciliationSnapshots)
  return snapshot
}

function listReconciliationSnapshots() {
  return reconciliationSnapshots.snapshots || []
}

function bootstrapRuntimeContinuity() {
  runtimeCheckpoint = persistRuntimeCheckpoint()
  if (!getLatestRuntimeSummary()) createRuntimeSummary('bootstrap')
  if (!(reconciliationSnapshots.snapshots || []).length) createReconciliationSnapshot()
}

function syncGovernanceStateFromRuntime(cooldown = null) {
  governanceState = updateGovernanceHeartbeat(governanceState, state.system)
  governanceState = recordCooldown(governanceState, cooldown, {
    reliableFallbackAvailable: hasReliableFallback(),
    now: nowIso(),
  })
  persistGovernance()
  return governanceState
}

function patchGovernedJobs(previousJobs = [], nextJobs = []) {
  const previousById = new Map((previousJobs || []).map((job) => [job.id, job]))
  for (const job of nextJobs || []) {
    const prev = previousById.get(job.id)
    if (!prev) continue
    const fields = ['status', 'routeStatus', 'providerOutage', 'outageReason', 'recoveryNote', 'nextAction', 'resumeCommand', 'tokenCostClass', 'recurring', 'parentRecurringJobId', 'updatedAt']
    const changed = fields.some((field) => JSON.stringify(prev[field] ?? null) !== JSON.stringify(job[field] ?? null))
    if (!changed) continue
    saveJob({
      id: job.id,
      status: job.status,
      routeStatus: job.routeStatus,
      providerOutage: job.providerOutage,
      outageReason: job.outageReason,
      recoveryNote: job.recoveryNote,
      nextAction: job.nextAction,
      resumeCommand: job.resumeCommand,
      tokenCostClass: job.tokenCostClass,
      recurring: job.recurring,
      parentRecurringJobId: job.parentRecurringJobId,
      updatedAt: job.updatedAt || nowIso(),
    })
  }
}

function reconcileGovernedRuntimeState({ providerHealthy = true } = {}) {
  const startedAt = nowIso()
  const cooldown = getExecutorCooldownSummary()
  syncGovernanceStateFromRuntime(cooldown)

  const report = buildAndPersistRecoveryReconciliationReport()
  governanceState.recovery = {
    reconciliationRequired: Boolean(report?.reconciliationRequired),
    autoResumeEnabled: Boolean(report?.autoResumeEnabled),
    lastReconciledAt: report?.generatedAt || startedAt,
    reportPath: recoveryReconciliationJsonPath,
  }
  persistGovernance()

  if (report?.reconciliationRequired || !report?.autoResumeEnabled) {
    governanceState.cooldown.pausedJobIds = governanceState.cooldown.pausedJobIds || []
    governanceState.cooldown.resumedJobIds = []
    governanceState.cooldown.missedRecurringJobIds = governanceState.cooldown.missedRecurringJobIds || []
    persistGovernance()
    return {
      gated: true,
      reason: report?.freezeReason || 'Recovery reconciliation gate active.',
      report,
    }
  }

  const before = jobStore.deriveLedgerView()
  const stale = recoverStaleRunningJobs(before, { now: startedAt, timeoutMs: 60 * 60 * 1000 })
  patchGovernedJobs(before, stale.jobs)

  const afterStale = jobStore.deriveLedgerView()
  const paused = applyCooldownPauseToJobs(afterStale, governanceState, { now: startedAt })
  patchGovernedJobs(afterStale, paused.jobs)

  const afterPause = jobStore.deriveLedgerView()
  const resumed = recoverPausedProviderBlockedJobs(afterPause, governanceState, { providerHealthy, now: startedAt })
  patchGovernedJobs(afterPause, resumed.jobs)

  const afterResume = jobStore.deriveLedgerView()
  const recurring = reconcileRecurringRecovery(afterResume, {
    now: startedAt,
    cooldownActive: Boolean(governanceState.cooldown?.active),
    runtimeOutage: !providerHealthy,
    providerHealthy,
  })
  patchGovernedJobs(afterResume, recurring.jobs)

  for (const lateRun of recurring.createdLateRuns || []) {
    saveJob(lateRun)
  }

  governanceState.cooldown.pausedJobIds = paused.pausedJobIds || []
  governanceState.cooldown.resumedJobIds = resumed.resumedJobIds || []
  governanceState.cooldown.missedRecurringJobIds = recurring.missedJobIds || []
  persistGovernance()
  return {
    gated: false,
    report: buildAndPersistRecoveryReconciliationReport(),
  }
}

function getAgentRegistryRecord(id = '') {
  return findAgentRecord(getAgentRegistryView(), id)
}

function syncCanonicalJobCaches() {
  jobsLedger = jobStore.deriveLedgerView()
  state.jobs = jobStore.deriveMissionStateJobs()
  syncAgentRegistryState()
  state.system.updatedAt = nowIso()
  persistState()
}

const intentAuditLog = []

// IRL — Instruction Reconciliation Layer
const PRIORITY_DOMAINS = ['ledger', 'routing', 'execution', 'observability', 'formatting']
const instructionRegistry = {
  ledger: [],
  routing: [],
  execution: [],
  observability: [],
  formatting: [],
  _changelog: [],
}

// Hydrate from disk at startup
;(function hydrateIRL() {
  const saved = loadIRLState()
  if (!saved) return
  for (const domain of PRIORITY_DOMAINS) {
    instructionRegistry[domain] = Array.isArray(saved[domain]) ? saved[domain] : []
  }
  instructionRegistry._changelog = Array.isArray(saved._changelog) ? saved._changelog : []
})()

function getIRLPriority(domain) {
  const idx = PRIORITY_DOMAINS.indexOf(domain)
  return idx === -1 ? 999 : idx
}
function normalizeIRLAction(action) { return normalizeTaskKey(action || '') }
function getIRLBehaviorKey(entry) { return normalizeTaskKey(entry.behaviorKey || entry.intent || '') }
function areOpposingIRLActions(a, b) {
  const x = normalizeIRLAction(a), y = normalizeIRLAction(b)
  return [['allow','deny'],['create','block'],['enable','disable'],['require','forbid']]
    .some(([l,r]) => (x===l&&y===r)||(x===r&&y===l))
}
function findIRLConflicts(newEntry, reg, selfDomainEntries) {
  const conflicts = []
  const bk = getIRLBehaviorKey(newEntry)
  if (!bk || !newEntry.action) return conflicts
  for (const d of PRIORITY_DOMAINS) {
    // Use caller-provided retained entries for the new rule's own domain to avoid
    // scanning deprecated duplicates; use full registry for all other domains
    const entries = (d === newEntry.domain && selfDomainEntries) ? selfDomainEntries : (reg[d] || [])
    for (const ex of entries) {
      if (ex.status !== 'active' || !ex.action) continue
      if (getIRLBehaviorKey(ex) !== bk || !areOpposingIRLActions(newEntry.action, ex.action)) continue
      conflicts.push({ domain: d, rule: ex, priority: getIRLPriority(d) })
    }
  }
  return conflicts
}
function chooseIRLWinner(newEntry, conflicts) {
  const np = getIRLPriority(newEntry.domain)
  const best = conflicts.slice().sort((a,b) => a.priority - b.priority)[0]
  if (!best) return { winner: 'new', loser: null, reason: 'No active conflict found.' }
  if (np < best.priority) return { winner: 'new', loser: best, reason: `${newEntry.domain} priority overrides ${best.domain}.` }
  if (np > best.priority) return { winner: 'existing', loser: null, reason: `${best.domain} priority overrides ${newEntry.domain}.` }
  return { winner: 'new', loser: best, reason: `Same priority domain; newest rule replaces existing active conflict.` }
}

function reconcileInstructions(newInstruction, registry = instructionRegistry) {
  const { domain, rule, intent, source = 'system', behaviorKey, action } = newInstruction
  if (!PRIORITY_DOMAINS.includes(domain)) {
    return {
      canonicalInstructionSet: registry,
      appliedChanges: [],
      deprecatedRules: [],
      reasoningSummary: `Unknown domain "${domain}" — no change applied.`,
    }
  }

  const existing = registry[domain] || []
  const normIntent = normalizeTaskKey(intent)
  const ts = nowIso()

  const newEntry = {
    rule, intent, domain, source,
    behaviorKey: behaviorKey || intent,
    action: action || null,
    addedAt: ts, status: 'active',
  }

  // Deprecate active duplicates by same intent
  const deprecatedDuplicates = existing
    .filter(r => normalizeTaskKey(r.intent) === normIntent && r.status === 'active')
    .map(r => ({ ...r, status: 'deprecated', deprecatedAt: ts, replacedBy: rule, deprecatedReason: 'duplicate-intent' }))

  let retainedDomain = existing.filter(r =>
    !(normalizeTaskKey(r.intent) === normIntent && r.status === 'active')
  )

  // Conflict detection: pass full registry for cross-domain lookup, retainedDomain for self-domain
  const conflicts = findIRLConflicts(newEntry, registry, retainedDomain)
  const decision = chooseIRLWinner(newEntry, conflicts)

  let updated = { ...registry }
  const allDeprecated = [...deprecatedDuplicates]

  if (decision.winner === 'existing') {
    // New rule loses — store it as deprecated
    const deprecatedNew = { ...newEntry, status: 'deprecated', deprecatedAt: ts, deprecatedReason: 'priority-conflict-lost', blockedBy: decision.loser?.rule?.rule || null }
    updated[domain] = [...retainedDomain, ...deprecatedDuplicates, deprecatedNew]
    allDeprecated.push(newEntry)
  } else {
    // New rule wins — deprecate losing active conflicting rules
    for (const conflict of conflicts) {
      const fn = r => (r === conflict.rule || (r.intent === conflict.rule.intent && r.status === 'active'))
        ? { ...r, status: 'deprecated', deprecatedAt: ts, deprecatedReason: 'priority-conflict-lost', replacedBy: rule }
        : r
      if (conflict.domain === domain) {
        retainedDomain = retainedDomain.map(fn)
      } else {
        updated[conflict.domain] = (updated[conflict.domain] || registry[conflict.domain] || []).map(fn)
      }
      allDeprecated.push(conflict.rule)
    }
    updated[domain] = [...retainedDomain, ...deprecatedDuplicates, newEntry]
  }

  const changeEntry = {
    ts, domain, added: rule,
    deprecated: allDeprecated.map(r => r.rule),
    conflictsDetected: conflicts.length,
    conflictDecision: decision.winner,
    reasoningSummary: decision.reason,
  }
  updated._changelog = [...(registry._changelog || []), changeEntry].slice(-200)

  return {
    canonicalInstructionSet: updated,
    appliedChanges: [decision.winner === 'existing' ? `Blocked "${rule}" — lost to higher-priority rule` : deprecatedDuplicates.length ? `Replaced "${deprecatedDuplicates[0].rule}" → "${rule}" in ${domain}` : `Added "${rule}" to ${domain}`],
    deprecatedRules: allDeprecated.map(r => r.rule),
    conflictsDetected: conflicts.length,
    conflictDecision: decision.winner,
    reasoningSummary: `${decision.reason} ${deprecatedDuplicates.length} duplicate(s) deprecated. ${conflicts.length} conflict(s) resolved.`,
  }
}
if (jobsLedger.length === 0 && Array.isArray(state?.jobs)) {
  jobsLedger = state.jobs.map((job) => normalizeLedgerJob(job))
  saveJobsLedger()
}

function normalizeHermesSource(source = 'system') {
  if (String(source || '').toLowerCase() === 'nettie') return 'Nettie'
  if (String(source || '').toLowerCase() === 'user') return 'user'
  return source || 'system'
}

function normalizeHermesJobType(type, inputPayload = null) {
  const rawType = String(type || '').toLowerCase().trim()
  if (HERMES_JOB_TYPES.has(rawType)) return rawType
  if (rawType === 'image_analysis' || rawType === 'vision' || rawType === 'image') return 'image'
  if (rawType === 'file_process' || rawType === 'document' || rawType === 'doc') return 'document'
  if (rawType === 'command' || rawType === 'patch' || rawType === 'memory_write' || rawType === 'execution') return 'execution'
  if (rawType === 'text') return 'text'

  const payload = inputPayload && typeof inputPayload === 'object' ? inputPayload : null
  if (payload?.imageUrl || payload?.imagePath) return 'image'
  if (payload?.filePath || payload?.documentPath || payload?.filename) return 'document'
  if (payload?.command || payload?.patch || payload?.memory) return 'execution'
  return 'text'
}

function normalizeHermesStatus(status = 'queued') {
  const value = String(status || 'queued').toLowerCase().trim()
  if (value === 'completed' || value === 'success') return 'complete'
  if (value === 'queued' || value === 'running' || value === 'complete' || value === 'failed' || value === 'paused') return value
  if (value === 'paused_provider_blocked' || value === 'recoverable_stale') return 'paused'
  if (value === 'stopping' || value === 'blocked' || value === 'cancelled') return 'failed'
  return 'queued'
}

function toExecutionTrace(trace, fallbackMessage = null, fallbackLevel = 'info', timestamp = nowIso()) {
  if (Array.isArray(trace) && trace.length) {
    return trace.map((entry, index) => ({
      step: entry?.step || `trace_${index + 1}`,
      at: entry?.at || timestamp,
      level: entry?.level || fallbackLevel,
      message: entry?.message || String(entry || ''),
      data: entry?.data ?? null,
    }))
  }
  if (!fallbackMessage) return []
  return [{ step: 'state_update', at: timestamp, level: fallbackLevel, message: fallbackMessage, data: null }]
}

function normalizeLedgerJob(job = {}) {
  const ts = nowIso()
  const jobId = job.jobId || job.id || `job_${crypto.randomUUID().slice(0, 8)}`
  const source = normalizeHermesSource(job.source || 'system')
  const inputPayload = job.inputPayload ?? job.payload ?? null
  const status = normalizeHermesStatus(job.status || 'queued')
  const createdAt = job.createdAt || job.timestamps?.created || ts
  const updatedAt = job.updatedAt || job.timestamps?.updated || createdAt
  const completedAt = job.completedAt || job.timestamps?.completed || (status === 'complete' || status === 'failed' ? updatedAt : null)
  const executionTrace = toExecutionTrace(
    job.executionTrace,
    job.traceMessage || null,
    status === 'failed' ? 'error' : 'info',
    updatedAt,
  )

  return {
    jobId,
    id: jobId,
    source,
    type: normalizeHermesJobType(job.type, inputPayload),
    task: job.task || job.title || 'Untitled mission',
    agent: job.agent || job.owner || 'Nettie',
    status,
    routeStatus: job.routeStatus || (status === 'running' ? 'running' : status),
    inputPayload,
    context: job.context ?? null,
    executionPlan: Array.isArray(job.executionPlan) ? job.executionPlan : [],
    executionAssignments: Array.isArray(job.executionAssignments) ? job.executionAssignments : [],
    outputPayload: job.outputPayload ?? job.result ?? null,
    timestamps: {
      created: createdAt,
      updated: updatedAt,
      completed: completedAt,
    },
    executionTrace,
    providerOutage: job.providerOutage ?? false,
    lastKnownGoodStep: job.lastKnownGoodStep ?? null,
    resumeCommand: job.resumeCommand ?? null,
    artifactPath: job.artifactPath ?? null,
    projectPath: job.projectPath ?? null,
    nextAction: job.nextAction ?? null,
    recoveryNote: job.recoveryNote ?? null,
    outageReason: job.outageReason ?? null,
    createdAt,
    updatedAt,
    completedAt,
  }
}

function saveJobsLedger() {
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(jobsLedgerPath, JSON.stringify(jobsLedger, null, 2))
}

function saveJob(job) {
  const existing = jobStore.getJobById(job.id || job.jobId)
  const payload = { ...job }
  if (existing) {
    const updated = jobStore.updateJob(existing.id, payload)
    syncCanonicalJobCaches()
    return updated
  }
  const created = jobStore.createJob(payload)
  syncCanonicalJobCaches()
  return created.job || created
}

function getJobs(filterFn = null) {
  const ledger = jobStore.deriveLedgerView()
  return filterFn ? ledger.filter(filterFn) : ledger
}

function updateJobStatus(jobId, status, patch = {}) {
  const updated = jobStore.transitionJob(jobId, status, patch)
  if (!updated) return null
  syncCanonicalJobCaches()
  return updated
}

function loadStaleJobArchive() {
  try {
    if (!fs.existsSync(staleJobArchivePath)) return []
    return JSON.parse(fs.readFileSync(staleJobArchivePath, 'utf8'))
  } catch {
    return []
  }
}

function saveStaleJobArchive(entries = []) {
  fs.mkdirSync(jobArchiveDir, { recursive: true })
  fs.writeFileSync(staleJobArchivePath, JSON.stringify(entries, null, 2))
}

function archiveJobSnapshot(job, reason) {
  const archive = loadStaleJobArchive()
  const id = job?.id || job?.jobId
  if (!id || archive.some((entry) => entry.jobId === id)) return
  archive.unshift({
    jobId: id,
    archivedAt: nowIso(),
    reason,
    task: job.task || job.title || '',
    owner: job.agent || job.owner || '',
    status: job.status || '',
    routeStatus: job.routeStatus || '',
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
    source: job.source || null,
  })
  saveStaleJobArchive(archive.slice(0, 500))
}

function isArchiveableStaleTestJob(job = {}) {
  const status = String(job.status || '').toLowerCase()
  if (status !== 'queued') return false
  const text = `${job.task || ''} ${job.title || ''} ${job.description || ''}`.toLowerCase()
  if (!/\b(test|validation ping|bridge validation|live response loop|smoke|ping only|executor status test)\b/.test(text)) return false
  const updatedAt = job.updatedAt || job.createdAt
  if (!updatedAt) return false
  const ageMs = Date.now() - new Date(updatedAt).getTime()
  return Number.isFinite(ageMs) && ageMs > 12 * 60 * 60 * 1000
}

function sweepStaleQueuedTestJobs() {
  const candidates = getJobs(isArchiveableStaleTestJob)
  if (!candidates.length) return { archived: 0, ids: [] }
  const archivedIds = []
  for (const job of candidates) {
    archiveJobSnapshot(job, 'stale_queued_test_job')
    const updated = updateJobStatus(job.id, 'cancelled', {
      routeStatus: 'archived-stale-test-job',
      updatedAt: nowIso(),
      completedAt: nowIso(),
      archivePath: staleJobArchivePath,
      nextAction: 'Archived stale test/validation job',
    })
    const stateJob = state.jobs.find((entry) => entry.id === job.id)
    if (stateJob) {
      stateJob.status = 'cancelled'
      stateJob.routeStatus = 'archived-stale-test-job'
      stateJob.updatedAt = nowIso()
    }
    if (updated?.id) archivedIds.push(updated.id)
  }
  if (archivedIds.length) log('info', `Archived stale queued test jobs: ${archivedIds.join(', ')}`)
  return { archived: archivedIds.length, ids: archivedIds }
}

function normalizeTaskKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeForMatch(value = '') {
  return normalizeTaskKey(value)
    .split(' ')
    .filter(Boolean)
    .map((token) => token.endsWith('ies') ? `${token.slice(0, -3)}y` : token.endsWith('s') ? token.slice(0, -1) : token)
}

function inferBucket(status = '', routeStatus = '') {
  const s = String(status || '').toLowerCase()
  const r = String(routeStatus || '').toLowerCase()
  if (s === 'running' || r === 'running') return 'running'
  if (s === 'queued' || r === 'queued' || r.startsWith('awaiting-')) return 'queued'
  if (s === 'paused' || r === 'paused') return 'paused'
  if (s === 'blocked' || r === 'blocked') return 'blocked'
  if (s === 'completed' || s === 'complete') return 'completedRecent'
  if (s === 'failed') return 'blocked'
  if (s === 'cancelled') return 'completedRecent'
  return OPEN_STATUSES.has(s) ? 'active' : 'active'
}

function listFilesRecursive(rootPath, predicate, collected = [], seen = new Set()) {
  if (!rootPath || collected.length >= maxRegistryFiles || seen.has(rootPath)) return collected
  seen.add(rootPath)
  let entries = []
  try {
    entries = fs.readdirSync(rootPath, { withFileTypes: true })
  } catch {
    return collected
  }

  for (const entry of entries) {
    if (collected.length >= maxRegistryFiles) break
    const full = path.join(rootPath, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue
      listFilesRecursive(full, predicate, collected, seen)
      continue
    }
    if (predicate(full, entry)) collected.push(full)
  }
  return collected
}

function parseProjectLedger(markdown, sourcePath) {
  const lines = String(markdown || '').split(/\r?\n/)
  const get = (prefix, fallback = '') => {
    const line = lines.find(l => l.toLowerCase().startsWith(prefix.toLowerCase())) || ''
    return line.includes(':') ? line.split(':').slice(1).join(':').trim() : fallback
  }
  const project = get('Project', path.basename(path.dirname(sourcePath)))
  const owner = get('Execution owner', 'Van')
  const phase = get('Current phase', 'Execution')
  const statusLine = get('Status', 'Active')
  let status = 'running'
  let routeStatus = 'project-ledger'

  if (/completed|done|go with caveats|passed/i.test(statusLine)) status = 'completed'
  else if (/paused|on hold|deferred/i.test(statusLine)) status = 'paused'
  else if (/blocked|blocker|fail/i.test(statusLine)) status = 'blocked'
  else if (/queued|awaiting/i.test(statusLine)) status = 'queued'
  if (TOKEN_OUTAGE_RE.test(statusLine)) {
    status = 'paused'
    routeStatus = 'token-outage'
  }

  return {
    id: `project_${crypto.createHash('md5').update(sourcePath).digest('hex').slice(0, 8)}`,
    task: `${project} — ${phase}`,
    agent: owner || 'Van',
    status,
    routeStatus,
    source: sourcePath,
    detail: statusLine,
    searchable: `${project} ${phase} ${statusLine} ${sourcePath} ${String(markdown || '').slice(0, 5000)}`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

function collectProjectLedgerEntries() {
  const files = []
  for (const rootPath of projectRoots) {
    listFilesRecursive(rootPath, (full) => /project-state-ledger\.md$/i.test(full), files)
  }

  const entries = []
  for (const ledgerPath of files) {
    try {
      const content = fs.readFileSync(ledgerPath, 'utf8')
      entries.push(parseProjectLedger(content, ledgerPath))
    } catch {
      // skip unreadable project ledgers
    }
  }
  return { files, entries }
}

function hydrateCanonicalJobStore() {
  const projectLedger = collectProjectLedgerEntries()
  const recoveryLedger = loadRecoveryLedger?.() || null
  jobStore.loadJobs({
    legacyJobs: jobsLedger,
    legacyStateJobs: state.jobs,
    legacyRecoveryEntries: recoveryLedger?.entries || [],
    projectLedgerEntries: projectLedger.entries,
  })
  syncCanonicalJobCaches()
  saveJobsLedger()
}

hydrateCanonicalJobStore()

// ===========================================================
// RECOVERY LEDGER — outage-safe persistent work state
// ===========================================================
function buildRecoveryEntries() {
  const registry = []
  const seen = new Set()

  const pushEntry = (raw, sourceLabel) => {
    const job = normalizeLedgerJob(raw)
    const dedupeKey = `${job.agent}|${normalizeTaskKey(job.task)}|${job.status}`
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    registry.push({
      jobId: job.id,
      project: job.task,
      task: job.task,
      owner: job.agent,
      status: job.status,
      source: sourceLabel || job.source || 'mission-control',
      lastUpdate: job.updatedAt || nowIso(),
      nextAction: job.nextAction || deriveNextAction(job),
      recoveryNote: job.recoveryNote || null,
      providerOutage: job.providerOutage ?? false,
      lastKnownGoodStep: job.lastKnownGoodStep ?? null,
      resumeCommand: job.resumeCommand ?? deriveResumeCommand(job),
      artifactPath: job.artifactPath ?? null,
      projectPath: job.projectPath ?? null,
      outageReason: job.outageReason ?? null,
    })
  }

  for (const job of getJobs()) pushEntry(job, `MC UI`)
  for (const job of (state.jobs || [])) pushEntry(job, 'MC state')
  for (const worker of (state.workers || [])) {
    pushEntry({
      id: worker.jobId || worker.id,
      task: worker.jobTitle || `Worker ${worker.id}`,
      agent: 'Van',
      status: worker.status === 'completed' ? 'completed' : worker.status === 'failed' ? 'blocked' : worker.status,
      source: 'Hermes worker',
      updatedAt: worker.endedAt || worker.startedAt,
    }, 'Hermes')
  }
  const { entries } = collectProjectLedgerEntries()
  for (const entry of entries) pushEntry(entry, 'local project')

  return registry
}

function deriveNextAction(job) {
  if (job.providerOutage) return 'Wait for provider recovery, then resume with resumeCommand'
  if (job.status === 'blocked') return 'Identify and resolve blocker, then reassign'
  if (job.status === 'paused') return 'Resume via chat: "resume ' + (job.id || 'job_id') + '"'
  if (job.status === 'queued') return 'Assign to agent or trigger via MC chat'
  if (job.status === 'running') return 'Monitor for completion'
  if (job.status === 'completed' || job.status === 'complete') return 'Archive or close'
  return 'Review and update status'
}

function deriveResumeCommand(job) {
  if (job.status === 'completed' || job.status === 'complete' || job.status === 'failed') return null
  return `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/json" -d '{"message":"resume ${job.id || 'job_id'}"}'`
}

function buildRecoveryLedgerMd(entries) {
  const now = new Date().toISOString()
  const byStatus = { active: [], blocked: [], paused: [], queued: [], completed: [], failed: [] }
  for (const e of entries) {
    const bucket = ['running', 'in_progress', 'assigned'].includes(e.status) ? 'active'
      : byStatus[e.status] ? e.status : 'active'
    byStatus[bucket].push(e)
  }

  const sectionHeader = (title, jobs) => {
    if (!jobs.length) return ''
    const rows = jobs.map(j => [
      `| ${j.jobId} | ${j.project.slice(0, 45)} | ${j.owner} | ${j.status} | ${j.source} | ${j.lastUpdate.slice(0, 16)} | ${j.providerOutage ? '⚠ YES' : 'no'} |`,
      j.nextAction ? `  - **Next:** ${j.nextAction}` : '',
      j.resumeCommand ? `  - **Resume:** \`${j.resumeCommand.slice(0, 80)}...\`` : '',
      j.recoveryNote ? `  - **Note:** ${j.recoveryNote}` : '',
    ].filter(Boolean).join('\n'))
    return `\n## ${title} (${jobs.length})\n\n| Job ID | Task | Owner | Status | Source | Last Update | Outage |\n|--------|------|-------|--------|--------|-------------|--------|\n${rows.join('\n')}\n`
  }

  return [
    `# Mission Control — Work Recovery Ledger`,
    `_Last synced: ${now}_`,
    `_Total entries: ${entries.length} | Outage flags: ${entries.filter(e => e.providerOutage).length}_`,
    '',
    `## Recovery Quick Reference`,
    `- Resume a job: \`curl -s -X POST http://localhost:4174/api/chat -d '{"message":"resume job_xxx"}'\``,
    `- Get active work: \`curl -s http://localhost:4174/api/work/recovery-ledger\``,
    `- Sync ledger: \`curl -s -X POST http://localhost:4174/api/work/recovery-ledger/sync\``,
    `- Mark complete: \`curl -s -X POST http://localhost:4174/api/work/recovery-ledger/update -d '{"jobId":"job_xxx","status":"completed"}'\``,
    '',
    sectionHeader('🔴 BLOCKED', byStatus.blocked),
    sectionHeader('🟡 PAUSED', byStatus.paused),
    sectionHeader('🟢 ACTIVE / RUNNING', byStatus.active),
    sectionHeader('⬜ QUEUED', byStatus.queued),
    sectionHeader('✅ COMPLETED (recent)', byStatus.completed.slice(0, 10)),
    sectionHeader('❌ FAILED', byStatus.failed),
  ].join('\n')
}

function syncRecoveryLedger() {
  try {
    const entries = buildRecoveryEntries()
    const payload = {
      syncedAt: nowIso(),
      totalEntries: entries.length,
      outageFlags: entries.filter(e => e.providerOutage).length,
      entries,
    }
    fs.writeFileSync(recoveryLedgerJsonPath, JSON.stringify(payload, null, 2))
    fs.writeFileSync(recoveryLedgerMdPath, buildRecoveryLedgerMd(entries))
    return payload
  } catch (err) {
    console.error('[RECOVERY_LEDGER_SYNC_ERR]', err.message)
    return null
  }
}

function loadRecoveryLedger() {
  try {
    if (fs.existsSync(recoveryLedgerJsonPath)) {
      return JSON.parse(fs.readFileSync(recoveryLedgerJsonPath, 'utf8'))
    }
  } catch (e) {}
  return null
}

function updateRecoveryEntry(jobId, patch = {}) {
  const ledger = loadRecoveryLedger() || { entries: [] }
  const idx = ledger.entries.findIndex(e => e.jobId === jobId)
  if (idx < 0) {
    // also check jobs ledger
    const ledgerJob = updateJobStatus(jobId, patch.status || 'queued')
    if (patch.status) updateJobStatus(jobId, patch.status)
    return syncRecoveryLedger()
  }
  ledger.entries[idx] = { ...ledger.entries[idx], ...patch, lastUpdate: nowIso() }
  // mirror status back to jobs ledger
  if (patch.status) updateJobStatus(jobId, patch.status)
  ledger.syncedAt = nowIso()
  fs.writeFileSync(recoveryLedgerJsonPath, JSON.stringify(ledger, null, 2))
  fs.writeFileSync(recoveryLedgerMdPath, buildRecoveryLedgerMd(ledger.entries))
  return ledger
}

// Mark a job as provider-outage-blocked and write resume info
function markJobOutage(jobId, { reason = 'Provider outage', lastKnownGoodStep = null, resumeCommand = null, artifactPath = null } = {}) {
  const updated = jobStore.updateJob(jobId, {
    status: 'blocked',
    providerOutage: true,
    outageReason: reason,
    lastKnownGoodStep,
    resumeCommand,
    recoveryNote: `Blocked by: ${reason}. Resume when provider restores.`,
    artifactPath,
    updatedAt: nowIso(),
    history: [{
      at: nowIso(),
      type: 'outage',
      status: 'blocked',
      message: reason,
      data: { lastKnownGoodStep, resumeCommand, artifactPath },
    }],
  })
  if (updated) syncCanonicalJobCaches()
  log('warn', `[OUTAGE] Job ${jobId} marked blocked: ${reason}`)
  return syncRecoveryLedger()
}

// Sync on startup
const startupStaleSweep = sweepStaleQueuedTestJobs()
syncRecoveryLedger()
bootstrapRuntimeContinuity()
if (startupStaleSweep.archived > 0) {
  console.log(`[STALE_SWEEP] Archived ${startupStaleSweep.archived} stale queued test job(s)`)
}
setInterval(() => {
  const result = sweepStaleQueuedTestJobs()
  if (result.archived > 0) {
    syncRecoveryLedger()
    console.log(`[STALE_SWEEP] Archived ${result.archived} stale queued test job(s)`)
  }
}, 60 * 60 * 1000)

// ===========================================================
// CONTINUOUS IMPROVEMENT (CI) LAYER
// ===========================================================

function loadCIRegister() {
  try {
    if (fs.existsSync(ciRegisterJsonPath)) return JSON.parse(fs.readFileSync(ciRegisterJsonPath, 'utf8'))
  } catch (e) { console.error('[CI_LOAD_ERR]', e.message) }
  return { syncedAt: nowIso(), entries: [] }
}

function saveCIRegister(register) {
  fs.writeFileSync(ciRegisterJsonPath, JSON.stringify(register, null, 2))
}

function scoreCIEntry(entry) {
  // score = urgency (1-5) * frequency (count) * impact (1-5), log-scaled on frequency
  return Math.round(entry.urgency * Math.log1p(entry.frequency) * entry.impact * 10) / 10
}

function upsertCIEntry(register, patch) {
  const existing = register.entries.find(e => e.fingerprint === patch.fingerprint)
  if (existing) {
    existing.frequency += 1
    existing.lastSeenAt = nowIso()
    if (patch.description) existing.description = patch.description
    if (patch.proposedFix) existing.proposedFix = patch.proposedFix
    existing.score = scoreCIEntry(existing)
    return existing
  }
  const entry = {
    id: `ci_${crypto.randomUUID().slice(0, 8)}`,
    fingerprint: patch.fingerprint,
    type: patch.type || 'pattern',
    title: patch.title,
    description: patch.description || '',
    source: patch.source || 'ingest',
    urgency: patch.urgency ?? 3,
    frequency: 1,
    impact: patch.impact ?? 3,
    score: 0,
    status: 'open',
    proposedFix: patch.proposedFix || null,
    linkedJobIds: patch.linkedJobIds || [],
    linkedProjects: patch.linkedProjects || [],
    firstSeenAt: nowIso(),
    lastSeenAt: nowIso(),
    resolvedAt: null,
  }
  entry.score = scoreCIEntry(entry)
  register.entries.unshift(entry)
  return entry
}

function ingestIntoCIRegister() {
  const register = loadCIRegister()
  const ledger = loadRecoveryLedger()
  const entries = ledger?.entries || []

  // Ingest: executor outage jobs
  for (const e of entries.filter(e => e.providerOutage)) {
    upsertCIEntry(register, {
      fingerprint: `outage|${e.owner}`,
      type: 'outage',
      title: `Provider outage affecting ${e.owner}`,
      description: e.outageReason || 'Provider outage detected',
      source: 'recovery-ledger',
      urgency: 5, impact: 4,
      proposedFix: 'Add provider fallback or retry logic with backoff',
      linkedJobIds: [e.jobId],
    })
  }

  // Ingest: blocked jobs (non-cancelled)
  for (const e of entries.filter(e => e.status === 'blocked' && !e.providerOutage)) {
    upsertCIEntry(register, {
      fingerprint: `blocked|${e.owner}|${normalizeTaskKey(e.task).slice(0, 30)}`,
      type: 'repeated_failure',
      title: `Blocked job: ${e.task.slice(0, 50)}`,
      description: `Job ${e.jobId} is blocked. Owner: ${e.owner}`,
      source: 'recovery-ledger',
      urgency: 4, impact: 3,
      proposedFix: 'Identify blocker root cause and add resolution step to assignment flow',
      linkedJobIds: [e.jobId],
    })
  }

  // Ingest: Van overload (single agent holding >5 open jobs)
  const byAgent = {}
  for (const e of entries.filter(e => !['completed','cancelled','failed'].includes(e.status))) {
    byAgent[e.owner] = (byAgent[e.owner] || 0) + 1
  }
  for (const [agent, count] of Object.entries(byAgent)) {
    if (count > 5) {
      upsertCIEntry(register, {
        fingerprint: `overload|${agent}`,
        type: 'pattern',
        title: `${agent} holding ${count} open jobs`,
        description: `Single agent concentration risk: ${agent} owns ${count} unresolved jobs`,
        source: 'registry',
        urgency: 3, impact: 4,
        proposedFix: 'Redistribute jobs to other agents or trigger execution to clear queue',
      })
    }
  }

  // Ingest: token outage signals from chat history
  const chatText = JSON.stringify(state.chat || []).slice(0, 100000)
  if (TOKEN_OUTAGE_RE.test(chatText)) {
    upsertCIEntry(register, {
      fingerprint: 'token_outage|chat',
      type: 'outage',
      title: 'Token/executor outage detected in chat history',
      description: 'Chat history contains token outage or rate limit signals',
      source: 'chat',
      urgency: 4, impact: 5,
      proposedFix: 'Implement provider fallback chain and outage-aware retry in askHermesAsync',
    })
  }

  // Sort by score descending
  register.entries.sort((a, b) => b.score - a.score)
  register.syncedAt = nowIso()
  register.totalEntries = register.entries.length
  register.openCount = register.entries.filter(e => e.status === 'open').length
  saveCIRegister(register)
  writeCIRegisterMd(register)
  return register
}

function writeCIRegisterMd(register) {
  const entries = register.entries || []
  const open = entries.filter(e => e.status === 'open')
  const resolved = entries.filter(e => e.status === 'resolved')

  const fmtEntry = e => [
    `### ${e.id} — ${e.title}`,
    `- **Type:** ${e.type} | **Status:** ${e.status} | **Score:** ${e.score}`,
    `- **Urgency:** ${e.urgency}/5 | **Frequency:** ${e.frequency} | **Impact:** ${e.impact}/5`,
    `- **Source:** ${e.source} | **First seen:** ${e.firstSeenAt?.slice(0,16)} | **Last seen:** ${e.lastSeenAt?.slice(0,16)}`,
    e.description ? `- **Description:** ${e.description}` : '',
    e.proposedFix ? `- **Proposed fix:** ${e.proposedFix}` : '',
    e.linkedJobIds?.length ? `- **Linked jobs:** ${e.linkedJobIds.join(', ')}` : '',
  ].filter(Boolean).join('\n')

  const md = [
    '# Mission Control — CI Register',
    `_Last synced: ${register.syncedAt?.slice(0,19)}_`,
    `_Open: ${register.openCount} | Total: ${register.totalEntries}_`,
    '',
    '## Open Issues (by score)',
    open.length ? open.map(fmtEntry).join('\n\n') : '_No open CI issues._',
    '',
    '## Resolved',
    resolved.length ? resolved.slice(0, 5).map(fmtEntry).join('\n\n') : '_None yet._',
  ].join('\n')

  fs.writeFileSync(ciRegisterMdPath, md)
}

// Ingest on startup
ingestIntoCIRegister()

function buildMasterWorkRegistry() {
  const workers = Array.isArray(state.workers) ? state.workers : []
  const registry = jobStore.deriveRegistryView({ workerEntries: workers })
  registry.sources.push({ name: 'mc.state.jobs', count: state.jobs.length, path: statePath })
  registry.sources.push({ name: 'legacy.jobsLedger.cache', count: jobsLedger.length, path: jobsLedgerPath })
  const stateText = JSON.stringify(state.chat || []).slice(0, 200000)
  if (TOKEN_OUTAGE_RE.test(stateText)) {
    registry.sources.push({ name: 'chat-token-outage-signals', count: 1, path: statePath })
  }
  return registry
}

function queryWorkStatus(projectQuery = '') {
  const query = normalizeTaskKey(projectQuery)
  const registry = buildMasterWorkRegistry()
  if (!query) return { query: projectQuery, matches: [], registry }

  const all = [
    ...registry.active,
    ...registry.queued,
    ...registry.running,
    ...registry.paused,
    ...registry.blocked,
    ...registry.completedRecent,
  ]

  const matches = all.filter(item => {
    const searchable = tokenizeForMatch(`${item.task} ${item.agent} ${item.source} ${item.detail || ''} ${item.searchable || ''}`)
    if (!searchable.length) return false
    const queryTokens = tokenizeForMatch(query)
    if (!queryTokens.length) return false
    const overlap = queryTokens.filter((token) => searchable.includes(token)).length
    if (overlap >= Math.min(2, queryTokens.length)) return true
    return normalizeTaskKey(`${item.task} ${item.source} ${item.searchable || ''}`).includes(normalizeTaskKey(projectQuery))
  })

  return { query: projectQuery, matches, registry }
}

function findOpenDuplicateJob(agent, task) {
  return jobStore.findDuplicateJob({
    department: agent,
    task,
  })
}

function persistState() {
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

syncAgentRegistryState()
reconcileGovernedRuntimeState()
persistState()

function log(level, message) {
  const entry = { id: crypto.randomUUID(), ts: nowIso(), level, message }
  state.logs.unshift(entry)
  state.logs = state.logs.slice(0, 200)
  state.system.updatedAt = nowIso()
  persistState()
  return entry
}

function ensureWorkerDir(workerId) {
  const dir = path.join(workersDir, workerId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeWorkerFiles(worker, workerDir) {
  fs.writeFileSync(path.join(workerDir, 'stdout.log'), worker.stdout || '')
  fs.writeFileSync(path.join(workerDir, 'stderr.log'), worker.stderr || '')
  fs.writeFileSync(path.join(workerDir, 'result.txt'), worker.result || '')
}

function sanitizeExecutorText(text = '') {
  return String(text || '')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/sess-[A-Za-z0-9_-]+/g, '[redacted]')
    .trim()
}

function cleanCodexOutput(text = '') {
  const sanitized = sanitizeExecutorText(text)
  const lines = sanitized.split(/\r?\n/)
  const filtered = lines.filter((line) => {
    const value = line.trim()
    if (!value) return false
    if (value === 'codex') return false
    if (value === 'tokens used') return false
    if (/^[\d,]+$/.test(value)) return false
    if (/^OpenAI Codex v/i.test(value)) return false
    if (/^-{3,}$/.test(value)) return false
    return true
  })
  if (filtered.includes(CODEX_CONNECTED_TEXT)) return CODEX_CONNECTED_TEXT
  return filtered.join('\n').trim()
}

function classifyExecutorError({ error = null, stderr = '', stdout = '', code = 0, timedOut = false, executor = 'executor' } = {}) {
  const text = `${error?.message || ''}\n${stderr || ''}\n${stdout || ''}`.toLowerCase()
  if (timedOut || /timed?\s*out|timeout/.test(text)) return { type: 'timeout', message: `${executor} timeout` }
  if (error?.code === 'ENOENT' || /command not found|not found/.test(text)) return { type: 'not_installed', message: `${executor} not installed` }
  if (/\b401\b|unauthorized|not authenticated|authentication|auth|credentials?|login required|sign in/.test(text)) return { type: 'auth', message: `${executor} authentication failure` }
  if (/\b429\b|rate limit|rate-limited|cooldown|quota/.test(text)) return { type: 'rate_limited', message: `${executor} rate limited or in cooldown` }
  if (code !== 0) return { type: 'nonzero_exit', message: `${executor} failed` }
  if (!sanitizeExecutorText(stdout).trim()) return { type: 'empty_output', message: `${executor} returned no usable response` }
  return { type: 'ok', message: `${executor} ok` }
}

function runCommandCapture(command, args, { cwd = root, timeoutMs = CODEX_EXEC_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env: process.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, timeoutMs)

    child.stdout.on('data', d => { stdout += d.toString() })
    child.stderr.on('data', d => { stderr += d.toString() })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ code: null, signal: null, stdout, stderr, error, timedOut })
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ code, signal, stdout, stderr, error: null, timedOut })
    })
  })
}

function getCodexAvailability() {
  const whichCheck = spawnSync('which', ['codex'], { encoding: 'utf8' })
  if (whichCheck.status !== 0) {
    return { codexAvailable: false, codexVersion: null, codexPath: null }
  }
  const versionCheck = spawnSync('codex', ['--version'], { encoding: 'utf8' })
  return {
    codexAvailable: versionCheck.status === 0,
    codexVersion: versionCheck.status === 0 ? String(versionCheck.stdout || versionCheck.stderr || '').trim() : null,
    codexPath: String(whichCheck.stdout || '').trim() || null,
  }
}

async function runCodexSmokeTest(prompt = 'Reply with exactly: CODEX_EXECUTOR_CONNECTED', projectPath = root) {
  const availability = getCodexAvailability()
  if (!availability.codexAvailable) {
    return {
      ...availability,
      codexAuthStatus: 'not_installed',
      ok: false,
      output: '',
      error: 'Codex executor not installed',
    }
  }
  const result = await runCommandCapture('codex', ['exec', '--cd', projectPath, prompt], {
    cwd: projectPath,
    timeoutMs: CODEX_EXEC_TIMEOUT_MS,
  })
  const output = cleanCodexOutput(result.stdout)
  const classification = classifyExecutorError({
    ...result,
    stdout: output,
    executor: 'Codex executor',
  })
  const connected = output.includes(CODEX_CONNECTED_TEXT)
  const ok = classification.type === 'ok' && connected
  return {
    ...availability,
    codexAuthStatus: ok ? 'authenticated' : classification.type,
    ok,
    output,
    error: ok ? null : classification.message,
    stderrPreview: sanitizeExecutorText(result.stderr).slice(0, 500),
  }
}

async function getExecutorsHealth({ force = false } = {}) {
  if (!force && executorHealthCache && Date.now() - executorHealthCache.checkedAtMs < EXECUTOR_HEALTH_CACHE_MS) {
    return executorHealthCache.payload
  }
  const codex = await runCodexSmokeTest()
  const selectedExecutor = selectExecutor(codex)
  let recommendation = 'No executor available'
  if (codex.ok) recommendation = 'Codex executor available'
  else if (codex.codexAuthStatus === 'auth') recommendation = 'Codex auth error'
  else if (codex.codexAuthStatus === 'rate_limited') recommendation = 'Codex rate limited'
  else if (codex.codexAvailable) recommendation = 'Codex unavailable'
  else recommendation = 'No executor available'
  const payload = {
    codexAvailable: codex.codexAvailable,
    codexVersion: codex.codexVersion,
    codexAuthStatus: codex.codexAuthStatus,
    hermesAvailable,
    hermesMode: 'legacy/manual-only',
    selectedExecutor,
    fallbackExecutor: AI_EXECUTION_FALLBACK,
    localFallback: LOCAL_EXECUTION_FALLBACK,
    lastExecutorError,
    recommendation,
    checkedAt: nowIso(),
  }
  executorHealthCache = { checkedAtMs: Date.now(), payload }
  return payload
}

function selectExecutor(codexHealth = null, requested = '') {
  const requestedExecutor = String(requested || '').toLowerCase()
  if (requestedExecutor === 'hermes') return hermesAvailable ? 'hermes' : 'none'
  const codexUsable = codexHealth ? codexHealth.ok : codexAvailable
  if (requestedExecutor === 'codex') return codexUsable ? 'codex' : 'none'
  if (AI_EXECUTION_PROVIDER === 'hermes') return 'none'
  if (codexUsable) return 'codex'
  return 'none'
}

function attachWorker(job) {
  const worker = [...state.workers].find((entry) => entry.id === job.workerId) || null
  return { ...job, worker }
}

function serializeWorkers() {
  return state.workers.map(({ process, ...rest }) => ({ ...rest }))
}

function refreshDerivedState() {
  state.system.updatedAt = nowIso()
  state.workers = serializeWorkers()
  syncAgentRegistryState()
  persistState()
}

function titleFromPrompt(prompt) {
  const cleaned = prompt
    .trim()
    .replace(/^please\s+/i, '')
    .replace(/\s+/g, ' ')
  if (!cleaned) return 'New command from Patrick'
  const words = cleaned.split(' ')
  return words.slice(0, 8).join(' ').replace(/[.!?]+$/, '')
}

function guessOwner(prompt) {
  const lower = String(prompt || '').toLowerCase()

  // Security / QA / guardrails
  if (/\bsecurity|audit|access|rate\s*limit|qa|test|regression|compliance|guardrail|vulnerability\b/.test(lower)) return 'Perry'

  // Finance / ROI / budgeting
  if (/\bbudget|cost|pricing|roi|revenue|margin|finance|forecast|pnl\b/.test(lower)) return 'Dana'

  // Technology / build / infra / iterations
  if (/\bsystem|infra|build|deploy|code|landing|app|api|integration|iteration|iterations|sprint|bugfix|implementation|worker|hermes|bridge|router|routing|ledger|middleware\b/.test(lower)) return 'Van'

  // Content Command / truth-first blog and SEO production
  if (/\bblog|article|articles|content\s+calendar|editorial|seo|meta\s+title|meta\s+description|slug|publishing\s+packet|content\s+packet|article\s+series|one-off\s+article|source\s+check\s+for\s+content|content\s+footprint\s+plan\b/.test(lower)) return 'Scribe'

  // Media / packaging / campaigns
  if (/\bcopy|marketing|social|media|creative|brand|packaging|campaign\b/.test(lower)) return 'Torina'

  // Intelligence / research / signals
  if (/\bresearch|competitor|intel|trend|signal|opportunity|scan|monitor\b/.test(lower)) return 'Funboy'

  // R&D / experiments
  if (/\bexperiment|model|prototype|r&d|lab\b/.test(lower)) return 'Rab'

  // Orchestration-only commands
  if (/\bbrief|status|report|command center|orchestrate|escalation\b/.test(lower)) return 'Nettie'

  // Default department-head execution lane
  return 'Van'
}

function guessPriority(prompt) {
  const lower = prompt.toLowerCase()
  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('blocker') || lower.includes('now')) return 'P0'
  if (lower.includes('today') || lower.includes('eod') || lower.includes('approval') || lower.includes('launch')) return 'P1'
  return 'P2'
}

function detectOfficeFromPrompt(prompt) {
  const lower = prompt.toLowerCase()
  return getAgentRegistryView().find((agent) => lower.includes(agent.displayName.toLowerCase())) || null
}

function buildOfficeBriefing(agent) {
  if (!agent) return 'I could not determine the department office.'
  const jobs = state.jobs.filter((job) => job.owner === agent.name)
  const workers = state.workers.filter((worker) => jobs.some((job) => job.workerId === worker.id || job.worker?.id === worker.id))
  const active = jobs.filter((job) => job.status === 'running' || job.stage === 'IN_PROGRESS')
  const blockers = jobs.filter((job) => job.priority === 'P0' || job.stage === 'EXEC_QA' || job.stage === 'APPROVAL')
  const top = jobs[0]
  return [
    `${agent.name} office check-in. Load ${agent.load}%. ${jobs.length} mission(s), ${workers.length} worker(s).`,
    top ? `Top mission: ${top.title} (${top.stage}, ${top.priority}).` : 'No active missions are assigned to this office.',
    active.length ? `${active.length} mission(s) are currently active.` : 'No active mission is currently running.',
    blockers.length ? `${blockers.length} item(s) need attention or approval.` : 'No major blockers are flagged in this office.',
  ].join('\n')
}

function makeJobPrompt(job, bodyPrompt = '') {
  return [
    'You are a Mission Control execution worker.',
    `Job id: ${job.id}`,
    `Job title: ${job.title}`,
    `Job owner: ${job.owner}`,
    `Job priority: ${job.priority}`,
    `Job stage: ${job.stage}`,
    `Job description: ${job.description}`,
    bodyPrompt ? `Operator prompt: ${bodyPrompt}` : '',
    'Return a concise operational summary, next actions, and blockers.',
  ].filter(Boolean).join('\n')
}

function getJobProjectPath(job = {}) {
  const candidate = job.projectPath || job.inputPayload?.projectPath || job.inputPayload?.project_path || job.inputPayload?.cwd
  if (!candidate) return root
  const resolved = path.resolve(String(candidate))
  if (!fs.existsSync(resolved)) return root
  return resolved
}

function updateWorkerJobOnFinish(worker, job, workerId) {
  const providerBlocked = worker.errorClassification?.type === 'rate_limited'
  const missionStatus = providerBlocked ? 'paused' : worker.status
  const idx = state.jobs.findIndex((entry) => entry.id === job.id)
  if (idx >= 0) {
    state.jobs[idx] = { ...state.jobs[idx], status: missionStatus, workerId, updatedAt: worker.endedAt, routeStatus: providerBlocked ? 'paused_provider_blocked' : worker.status }
    if (worker.status === 'completed') state.jobs[idx].stage = 'EXEC_QA'
  }
  const ledgerStatus = providerBlocked ? 'paused_provider_blocked' : (worker.status === 'completed' ? 'complete' : 'failed')
  const updatedJob = updateJobStatus(job.id, ledgerStatus, {
    updatedAt: worker.endedAt,
    completedAt: providerBlocked ? null : worker.endedAt,
    routeStatus: providerBlocked ? 'paused_provider_blocked' : undefined,
    providerOutage: providerBlocked,
    outageReason: providerBlocked ? worker.errorClassification?.message || 'provider cooldown/rate limit' : undefined,
    recoveryNote: providerBlocked ? 'Worker paused after provider cooldown/rate-limit signal.' : undefined,
    nextAction: providerBlocked ? 'Resume after provider cooldown clears.' : undefined,
    resumeCommand: providerBlocked ? `resume ${job.id}` : undefined,
    tokenCostClass: classifyJobTokenCost(job),
    outputPayload: {
      executor: worker.executor,
      exitCode: worker.exitCode,
      signal: worker.signal,
      result: worker.result,
      stdoutPath: path.join(worker.workerDir, 'stdout.log'),
      stderrPath: path.join(worker.workerDir, 'stderr.log'),
    },
    executionTrace: [{
      step: 'executor_finished',
      at: worker.endedAt,
      level: worker.status === 'completed' ? 'info' : 'error',
      message: worker.status,
      data: {
        executor: worker.executor,
        workerId,
        exitCode: worker.exitCode,
        classification: worker.errorClassification || null,
      },
    }],
  })
  if (updatedJob?.status === 'complete' && updatedJob?.recurring?.lateExecution) {
    saveJob(markRecurringRunCompletedLate(updatedJob, { now: worker.endedAt }))
  }
}

function launchCodexWorker(job, bodyPrompt = '') {
  if (!codexAvailable) {
    const error = new Error('Codex executor is not installed or codex --version failed.')
    lastExecutorError = { executor: 'codex', type: 'not_installed', message: error.message, at: nowIso() }
    throw error
  }

  const workerId = `wrk_${crypto.randomUUID().slice(0, 8)}`
  const workerDir = ensureWorkerDir(workerId)
  const projectPath = getJobProjectPath(job)
  const worker = {
    id: workerId,
    jobId: job.id,
    jobTitle: job.title,
    executor: 'codex',
    status: 'running',
    startedAt: nowIso(),
    endedAt: null,
    pid: null,
    exitCode: null,
    signal: null,
    stdout: '',
    stderr: '',
    result: '',
    prompt: makeJobPrompt(job, bodyPrompt),
    projectPath,
    workerDir,
  }

  const child = spawn('codex', ['exec', '--cd', projectPath, worker.prompt], {
    cwd: projectPath,
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  worker.pid = child.pid
  runningWorkers.set(workerId, child)

  child.stdout.on('data', (chunk) => {
    worker.stdout += chunk.toString()
    fs.appendFileSync(path.join(workerDir, 'stdout.log'), chunk)
  })

  child.stderr.on('data', (chunk) => {
    worker.stderr += chunk.toString()
    fs.appendFileSync(path.join(workerDir, 'stderr.log'), chunk)
  })

  child.on('error', (error) => {
    worker.status = 'failed'
    worker.endedAt = nowIso()
    worker.stderr += `\n${error.message}`
    worker.errorClassification = classifyExecutorError({ error, stderr: worker.stderr, executor: 'Codex executor' })
    worker.result = worker.errorClassification.message
    lastExecutorError = { executor: 'codex', ...worker.errorClassification, at: worker.endedAt }
    writeWorkerFiles(worker, workerDir)
    state.workers = [worker, ...state.workers.filter((entry) => entry.id !== workerId)]
    updateWorkerJobOnFinish(worker, job, workerId)
    log('error', `Codex worker ${workerId} failed to launch: ${error.message}`)
    refreshDerivedState()
  })

  child.on('close', (code, signal) => {
    runningWorkers.delete(workerId)
    worker.exitCode = code
    worker.signal = signal
    worker.endedAt = nowIso()
    worker.errorClassification = classifyExecutorError({
      stdout: worker.stdout,
      stderr: worker.stderr,
      code,
      executor: 'Codex executor',
    })
    worker.status = worker.errorClassification.type === 'ok' ? 'completed' : signal ? 'stopped' : (worker.errorClassification.type === 'rate_limited' ? 'paused' : 'failed')
    worker.result = cleanCodexOutput(worker.stdout).slice(-8000) || sanitizeExecutorText(worker.stderr).slice(-4000)
    if (worker.status !== 'completed') {
      lastExecutorError = { executor: 'codex', ...worker.errorClassification, at: worker.endedAt }
    }
    writeWorkerFiles(worker, workerDir)
    state.workers = [worker, ...state.workers.filter((entry) => entry.id !== workerId)]
    updateWorkerJobOnFinish(worker, job, workerId)
    log(worker.status === 'completed' ? 'info' : 'warn', `Codex worker ${workerId} finished with ${worker.status}`)
    refreshDerivedState()
  })

  state.workers = [worker, ...state.workers]
  job.workerId = workerId
  job.status = 'running'
  job.updatedAt = worker.startedAt
  updateJobStatus(job.id, 'running', {
    updatedAt: worker.startedAt,
    executionTrace: [{
      step: 'executor_started',
      at: worker.startedAt,
      level: 'info',
      message: 'running',
      data: { executor: 'codex', workerId, projectPath },
    }],
  })
  log('info', `Launched Codex worker ${workerId} for job ${job.id}`)
  refreshDerivedState()
  return worker
}

function launchSelectedWorker(job, bodyPrompt = '', requestedExecutor = '') {
  reconcileGovernedRuntimeState({ providerHealthy: true })
  const selected = selectExecutor(null, requestedExecutor)
  if (selected === 'codex') {
    try {
      return launchCodexWorker(job, bodyPrompt)
    } catch (error) {
      throw error
    }
  }
  if (selected === 'hermes') return launchHermesWorker(job, bodyPrompt)
  throw new Error('No executor available — Codex unavailable.')
}

function launchHermesWorker(job, bodyPrompt = '') {
  const governance = evaluateHermesGovernance({
    mcRuntimeOnline: true,
    breakGlassMode: Boolean(governanceState.break_glass_mode),
    hasApprovedOperatorCommand: Boolean(job?.source === 'Nettie' || job?.source === 'mission-control'),
    hasJobRecord: Boolean(job?.id),
    actionType: job?.inputPayload?.breakGlassMode ? 'recovery_diagnostic' : 'project_execution',
    task: bodyPrompt || job?.task || '',
  })
  if (!governance.allowed) {
    const error = new Error(governance.reason)
    error.code = 'HERMES_GOVERNANCE_BLOCKED'
    error.governance = governance
    throw error
  }
  if (!hermesAvailable) {
    throw new Error('Hermes CLI is not available on this machine.')
  }

  const workerId = `wrk_${crypto.randomUUID().slice(0, 8)}`
  const workerDir = ensureWorkerDir(workerId)
  const worker = {
    id: workerId,
    jobId: job.id,
    jobTitle: job.title,
    executor: 'hermes',
    status: 'running',
    startedAt: nowIso(),
    endedAt: null,
    pid: null,
    exitCode: null,
    signal: null,
    stdout: '',
    stderr: '',
    result: '',
    prompt: makeJobPrompt(job, bodyPrompt),
    workerDir,
  }

  const child = spawn('hermes', ['chat', '-q', worker.prompt, '--quiet'], {
    cwd: root,
    env: process.env,
    shell: false,
  })

  worker.pid = child.pid
  runningWorkers.set(workerId, child)

  child.stdout.on('data', (chunk) => {
    worker.stdout += chunk.toString()
    fs.appendFileSync(path.join(workerDir, 'stdout.log'), chunk)
  })

  child.stderr.on('data', (chunk) => {
    worker.stderr += chunk.toString()
    fs.appendFileSync(path.join(workerDir, 'stderr.log'), chunk)
  })

  child.on('error', (error) => {
    worker.status = 'failed'
    worker.endedAt = nowIso()
    worker.stderr += `\n${error.message}`
    worker.result = error.message
    writeWorkerFiles(worker, workerDir)
    state.workers = [worker, ...state.workers.filter((entry) => entry.id !== workerId)]
    const idx = state.jobs.findIndex((entry) => entry.id === job.id)
    if (idx >= 0) state.jobs[idx] = { ...state.jobs[idx], status: 'failed', workerId }
    updateJobStatus(job.id, 'failed')
    log('error', `Worker ${workerId} failed to launch: ${error.message}`)
    refreshDerivedState()
  })

  child.on('close', (code, signal) => {
    runningWorkers.delete(workerId)
    worker.exitCode = code
    worker.signal = signal
    worker.endedAt = nowIso()
    worker.status = code === 0 ? 'completed' : signal ? 'stopped' : 'failed'
    worker.result = worker.stdout.slice(-4000) || worker.stderr.slice(-4000)
    writeWorkerFiles(worker, workerDir)
    state.workers = [worker, ...state.workers.filter((entry) => entry.id !== workerId)]
    const idx = state.jobs.findIndex((entry) => entry.id === job.id)
    if (idx >= 0) {
      state.jobs[idx] = { ...state.jobs[idx], status: worker.status, workerId, updatedAt: worker.endedAt }
      if (worker.status === 'completed') state.jobs[idx].stage = 'EXEC_QA'
    }
    updateJobStatus(job.id, worker.status)
    log(worker.status === 'completed' ? 'info' : 'warn', `Worker ${workerId} finished with ${worker.status}`)
    refreshDerivedState()
  })

  state.workers = [worker, ...state.workers]
  job.workerId = workerId
  job.status = 'running'
  job.updatedAt = worker.startedAt
  updateJobStatus(job.id, 'running')
    log('info', `Launched fallback worker via Hermes ${workerId} for job ${job.id}`)
  refreshDerivedState()
  return worker
}

function buildPlatformHealth() {
  const registry = buildMasterWorkRegistry()
  const distHealthy = fs.existsSync(distDir)
  const ledgerExists = fs.existsSync(jobsLedgerPath)
  const recoveryExists = fs.existsSync(recoveryLedgerJsonPath)
  const ciExists = fs.existsSync(ciRegisterJsonPath)
  const irlExists = fs.existsSync(IRL_STATE_FILE)
  const routeCount = 18

  return {
    checkedAt: nowIso(),
    backend: 'healthy',
    frontendBuild: distHealthy ? 'present' : 'missing',
    backendCheck: 'available',
    ledgerStatus: ledgerExists ? 'healthy' : 'missing',
    registryStatus: registry ? 'healthy' : 'degraded',
    routeHealth: routeCount >= 11 ? 'configured' : 'incomplete',
    recoveryLedger: recoveryExists ? 'present' : 'missing',
    ciRegister: ciExists ? 'present' : 'missing',
    irlState: irlExists ? 'present' : 'missing',
    counts: {
      queued: registry.queued.length,
      running: registry.running.length,
      blocked: registry.blocked.length,
      completedRecent: registry.completedRecent.length,
      activeWorkers: (state.workers || []).filter((worker) => worker.status === 'running').length,
      duplicateLikeCompleted: registry.completedRecent.filter((item) => /shared groceries app/i.test(item.task || '')).length,
    },
    executors: {
      codexAvailable,
      hermesAvailable,
      selectedExecutor: state.system?.selectedExecutor || AI_EXECUTION_PROVIDER,
      fallbackExecutor: state.system?.fallbackExecutor || AI_EXECUTION_FALLBACK,
    },
    storage: {
      statePath,
      jobsLedgerPath,
      recoveryLedgerJsonPath,
      ciRegisterJsonPath,
      irlStatePath: IRL_STATE_FILE,
    },
  }
}

function buildControlPlaneSnapshot() {
  syncCanonicalJobCaches()
  const jobs = jobStore.deriveLedgerView().map(attachWorker)
  const registry = buildMasterWorkRegistry()
  const recoveryLedger = loadRecoveryLedger() || { entries: [] }
  const ciRegister = loadCIRegister() || { entries: [] }
  const health = buildPlatformHealth()
  const derived = buildMissionControlData({
    rootDir: root,
    runtimeDir,
    projectRoots,
    state,
    jobs,
    registry,
    workers: state.workers || [],
    recoveryLedger,
    ciRegister,
    instructionState: { rules: instructionRegistry },
    health,
  })

  return {
    ...derived,
    health,
    jobs,
    registry,
    recoveryLedger,
    ciRegister,
  }
}

function summarizeState() {
  const snapshot = buildControlPlaneSnapshot()
  return {
    system: state.system,
    counts: snapshot.dashboard.counts,
    jobs: snapshot.dashboard.jobs,
    agents: snapshot.departments.map((department) => ({
      id: department.id,
      name: department.name,
      role: department.title,
      status: department.metrics.openJobs > 0 ? 'active' : 'idle',
      load: department.status.currentWorkload,
      focus: department.domain,
    })),
    workers: state.workers,
    chat: state.chat,
    logs: state.logs.slice(0, 20),
    priorities: snapshot.dashboard.priorities,
    blockers: snapshot.dashboard.blockers,
    approvals: snapshot.dashboard.approvals,
    departments: snapshot.dashboard.departments,
    reports: snapshot.reports,
    projects: snapshot.projects,
    costs: snapshot.costs,
    integrations: snapshot.integrations,
    health: snapshot.health,
    registry: snapshot.registry,
  }
}

function statusBriefing() {
  const { counts } = summarizeState()
  const primaryJob = [...state.jobs].sort((a, b) => (a.priority > b.priority ? 1 : -1))[0]
  const line1 = `I see ${counts.jobs} live jobs, ${counts.activeWorkers} active executor workers, and ${counts.agents} executive staff online.`
  const line2 = `There are ${counts.urgentJobs} urgent jobs, ${counts.approvals} awaiting approval, and ${counts.qa} in QA.`
  const line3 = primaryJob ? `Highest priority item: ${primaryJob.title} (owner: ${primaryJob.owner}, stage: ${primaryJob.stage}).` : 'There are no queued missions at the moment.'
  return `${line1}\n${line2}\n${line3}`
}

function shouldAutoLaunch(prompt) {
  const lower = prompt.toLowerCase()
  return /\b(run|execute|launch|start|ship|deploy|build|create|make|route)\b/.test(lower)
}

function createJobFromChat(prompt) {
  const title = titleFromPrompt(prompt)
  const result = saveJob({
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    task: title,
    title,
    owner: guessOwner(prompt),
    department: guessOwner(prompt),
    priority: guessPriority(prompt),
    stage: 'SCOPED',
    status: 'queued',
    description: prompt,
    sourceType: 'mission-control',
    source: 'mission-control',
    workerId: null,
    updatedAt: nowIso(),
  })
  return jobStore.toMissionStateJob(result)
}

function makeHermesLogs(job, messages = []) {
  return messages.map((entry, index) => ({
    step: entry?.step || `log_${index + 1}`,
    at: entry?.at || nowIso(),
    level: entry?.level || 'info',
    message: entry?.message || String(entry || ''),
  }))
}

function decomposeTask(task = '') {
  const steps = []

  if (task.toLowerCase().includes('test')) {
    steps.push('Define test scope')
    steps.push('Execute validation checks')
    steps.push('Report results')
  } else if (task.toLowerCase().includes('fix') || task.toLowerCase().includes('patch')) {
    steps.push('Identify affected files')
    steps.push('Apply fix')
    steps.push('Run syntax check')
    steps.push('Validate behavior')
  } else {
    steps.push('Analyze task')
    steps.push('Execute core action')
    steps.push('Validate output')
  }

  return steps
}

function assignAgentsToSteps(steps, task = '') {
  const taskText = String(task || '').toLowerCase()

  const pickAgent = (step = '') => {
    const stepText = String(step || '').toLowerCase()
    if (/fix|patch|build|develop|implementation|bug/.test(taskText) || /affected file|apply fix|syntax check|validate behavior|core action/.test(stepText)) return 'Van'
    if (/finance|budget|roi|valuation|report|reporting|evaluate|evaluation/.test(taskText) || /finance|budget|roi|valuation|report|evaluation/.test(stepText)) return 'Dana'
    if (/design|ux|ui|content|copy|brand/.test(taskText) || /design|ux|ui|content|copy|brand/.test(stepText)) return 'Sophia'
    if (/routing|reconciliation|summary|operator|brief/.test(taskText) || /routing|reconciliation|summary|operator|brief/.test(stepText)) return 'Nettie'
    if (/orchestrat|coordination|delegate/.test(taskText) || /orchestrat|coordination|delegate/.test(stepText)) return 'Hermes'
    return 'Van'
  }

  return steps.map((step) => ({
    step,
    assignedTo: pickAgent(step),
    status: 'pending',
  }))
}

function buildHermesContext() {
  const summarizeJob = (job = {}) => ({
    id: job.id || job.jobId || null,
    task: job.task || job.title || null,
    status: job.status || null,
    type: job.type || null,
    source: job.source || null,
    agent: job.agent || job.owner || null,
    updatedAt: job.updatedAt || job.timestamps?.updated || null,
  })

  const activeJobs = jobsLedger.filter(j =>
    ['queued', 'running'].includes(j.status)
  )

  const recentCompleted = jobsLedger
    .filter(j => ['completed', 'complete'].includes(j.status))
    .slice(0, 5)

  const irlRules = Object.values(instructionRegistry || {})
    .flat()
    .filter(r => r?.status === 'active')

  return {
    activeJobs: activeJobs.slice(0, 5).map(summarizeJob),
    recentCompleted: recentCompleted.map(summarizeJob),
    activeIRLRules: irlRules.slice(0, 10).map(rule => ({
      domain: rule.domain || null,
      intent: rule.intent || null,
      rule: rule.rule || null,
      behaviorKey: rule.behaviorKey || null,
      action: rule.action || null,
      status: rule.status || null,
      source: rule.source || null,
    })),
  }
}

function makeHermesResponse(job, result = null, logs = [], extras = {}) {
  const hermesContext = job?.context || { activeJobs: [], recentCompleted: [], activeIRLRules: [] }
  return {
    jobId: job.jobId || job.id,
    status: normalizeHermesStatus(job.status),
    result,
    logs,
    executiveRole: 'Hermes',
    department: 'Development Execution',
    contextSummary: {
      activeJobsCount: hermesContext.activeJobs.length,
      recentCompletedCount: hermesContext.recentCompleted.length,
      activeRulesCount: hermesContext.activeIRLRules.length,
    },
    nextActionHint: 'Continue execution or request refinement',
    executionPlan: job?.executionPlan || [],
    executionAssignments: job?.executionAssignments || [],
    ...(extras.reused !== undefined ? { reused: extras.reused } : {}),
  }
}

function createHermesExecutionJob({ jobId = null, source = 'Nettie', type = 'execution', inputPayload = null, context = null, decision = 'new', receivedAt = nowIso(), executionPlan = [], executionAssignments = [] } = {}) {
  const ts = receivedAt || nowIso()
  return saveJob({
    id: jobId || `job_${crypto.randomUUID().slice(0, 8)}`,
    source,
    type,
    status: 'queued',
    task: inputPayload?.task || `${normalizeHermesJobType(type, inputPayload)} job`,
    agent: 'Hermes',
    inputPayload,
    context,
    executionPlan,
    executionAssignments,
    outputPayload: null,
    createdAt: ts,
    updatedAt: ts,
    timestamps: { created: ts, updated: ts, completed: null },
    executionTrace: [
      {
        step: 'execution_received',
        at: ts,
        level: 'info',
        message: decision,
        data: {
          receivedAt: ts,
          contextSnapshot: context,
          decision,
        },
      },
      { step: 'job_created', at: ts, level: 'info', message: 'queued', data: null },
    ],
  })
}

function buildDeterministicResult(job) {
  const payloadJson = JSON.stringify(job.inputPayload ?? null)
  const checksum = crypto.createHash('sha256').update(payloadJson).digest('hex')
  return {
    accepted: true,
    source: job.source,
    type: job.type,
    checksum,
    payloadSize: payloadJson.length,
    receivedKeys: job.inputPayload && typeof job.inputPayload === 'object' ? Object.keys(job.inputPayload).sort() : [],
  }
}

function executeHermesJob(job) {
  const runningAt = nowIso()
  updateJobStatus(job.id, 'running', {
    updatedAt: runningAt,
    traceMessage: 'execution_started',
    executionTrace: [{ step: 'execution_started', at: runningAt, level: 'info', message: 'running', data: { type: job.type } }],
  })

  try {
    const result = buildDeterministicResult(job)
    const completedAt = nowIso()
    const completedJob = updateJobStatus(job.id, 'complete', {
      updatedAt: completedAt,
      completedAt,
      outputPayload: result,
      executionTrace: [{ step: 'execution_completed', at: completedAt, level: 'info', message: 'complete', data: result }],
    })
    return makeHermesResponse(completedJob, result, makeHermesLogs(completedJob, completedJob.executionTrace))
  } catch (error) {
    const failedAt = nowIso()
    const failedResult = { error: error.message }
    const failedJob = updateJobStatus(job.id, 'failed', {
      updatedAt: failedAt,
      completedAt: failedAt,
      outputPayload: failedResult,
      executionTrace: [{ step: 'execution_failed', at: failedAt, level: 'error', message: error.message, data: null }],
    })
    return makeHermesResponse(failedJob, failedResult, makeHermesLogs(failedJob, failedJob.executionTrace))
  }
}

function addChatMessage(message) {
  state.chat.unshift(message)
  state.chat = state.chat.slice(0, 100)
}

function makeReplyForPrompt(prompt, createdJob) {
  const lower = prompt.toLowerCase()
  const office = detectOfficeFromPrompt(prompt)

  if (office && (lower.includes('working on') || lower.includes('what is') || lower.includes('what are') || lower.includes('office briefing') || lower.includes('check-in') || lower.includes('check in'))) {
    return {
      text: buildOfficeBriefing(office),
      kind: 'briefing',
    }
  }

  if (office && (lower.includes('blocked') || lower.includes('blocker') || lower.includes('approve') || lower.includes('approval'))) {
    const officeJobs = state.jobs.filter((job) => job.owner === office.name)
    const blockers = officeJobs.filter((job) => job.priority === 'P0' || job.stage === 'EXEC_QA' || job.stage === 'APPROVAL')
    return {
      text: blockers.length
        ? `${office.name} blockers and approvals:\n${blockers.map((job) => `• ${job.title} — ${job.stage} (${job.priority})`).join('\n')}`
        : `${office.name} has no blockers right now.`,
      kind: 'status',
    }
  }

  if (lower.includes('brief') || lower.includes('status') || lower.includes('summary') || lower.includes('report')) {
    return {
      text: statusBriefing(),
      kind: 'briefing',
    }
  }

  if (lower.includes('who is blocked') || lower.includes('blockers')) {
    const blocked = state.jobs.filter((job) => job.status !== 'completed' && job.priority !== 'P2').slice(0, 3)
    return {
      text: blocked.length
        ? `Top blockers:\n${blocked.map((job) => `• ${job.title} — owner ${job.owner}, stage ${job.stage}`).join('\n')}`
        : 'No major blockers are currently flagged.',
      kind: 'status',
    }
  }

  if (createdJob) {
    const launch = shouldAutoLaunch(prompt)
    return {
      text: launch
        ? `I turned that into ${createdJob.id} and launched the selected executor. I will surface progress as the worker updates.`
        : `I created ${createdJob.id} for ${createdJob.title}. It is queued with ${createdJob.owner} at ${createdJob.priority}.`,
      kind: 'job',
      launch,
    }
  }

  return {
    text: 'Acknowledged. I am standing by for the next executive instruction.',
    kind: 'ack',
  }
}

const app = express()
app.use((req, res, next) => {
  const origin = String(req.headers.origin || '')
  if (origin && isBridgeOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  return next()
})
app.use(express.json({ limit: '1mb' }))

function classifyExecutionIntent(message = '') {
  const m = String(message || '').toLowerCase()

  if (
    m.includes('execute') ||
    m.includes('run') ||
    m.includes('process') ||
    m.includes('analyze') ||
    m.includes('build') ||
    m.includes('test') ||
    m.includes('verify executor') ||
    m.includes('check executor health') ||
    m.includes('launch worker')
  ) {
    return 'execution'
  }

  if (
    m.startsWith('nettie —') &&
    (
      m.includes('task') ||
      m.includes('perform') ||
      m.includes('generate') ||
      m.includes('produce output')
    )
  ) {
    return 'execution'
  }

  return 'non_execution'
}

function isExplicitHermesRequest(message = '') {
  return /\b(use|test|run)\s+hermes\b|\bhermes\s+(fallback|legacy|manual)\b/i.test(String(message || ''))
}

function shouldRouteChatToHermes(message = '') {
  const msg = String(message || '').toLowerCase()
  const executionIntent = classifyExecutionIntent(msg) === 'execution'
  return isExplicitHermesRequest(msg) && executionIntent
}

function shouldRouteChatToExecutor(message = '') {
  return classifyExecutionIntent(message) === 'execution'
}

function shouldCreateJobForIntent(intent) {
  if (
    intent === 'job_refinement_directive' &&
    hasActiveIRLRule('routing', 'refinement isolation')
  ) {
    return false
  }
  return true
}

function handleJobRefinement(message) {
  if (!shouldCreateJobForIntent('job_refinement_directive')) {
    return {
      replyText: 'Nettie: Job refinement directive reconciled under IRL. No job created.',
      replyKind: 'system',
      job: null,
      createdJob: false,
    }
  }

  const jobId = (message.match(JOB_ID_RE) || [])[0]
  const job = jobId ? jobsLedger.find(j => j.id === jobId) : jobsLedger.filter(j => j.status === 'queued')[0]

  if (!job) {
    return {
      replyText: `Nettie: No job found to refine. Specify a valid job ID or ensure a queued job exists.`,
      replyKind: 'system',
      job: null,
    }
  }

  const task = String(job.task || job.title || '').trim()
  const area = /routing|intent|classification|detection/.test(task.toLowerCase())
    ? 'server.js — intent routing (detectIntent, handleNettieInbound)'
    : /brief|operational|ledger/.test(task.toLowerCase())
      ? 'server.js — operational brief (handleOperationalBrief, buildMasterWorkRegistry)'
      : /ui|frontend|nettie page|chat/.test(task.toLowerCase())
        ? 'src/pages/Nettie.jsx'
        : 'TBD — requires scoping conversation'

  const lines = [
    `Nettie: Job Refinement — ${job.id}`,
    ``,
    `ORIGINAL JOB ID:    ${job.id}`,
    `CURRENT STATUS:     ${job.status}`,
    `ASSIGNED TO:        ${job.agent || 'Van'}`,
    ``,
    `ORIGINAL TASK`,
    task.slice(0, 400) || '(no task description)',
    ``,
    `REFINED TASK DESCRIPTION`,
    `Clarify, scope, and implement: "${task.slice(0, 120)}"`,
    `Ensure the implementation is minimal, targeted, and does not introduce side effects.`,
    ``,
    `EXPECTED BEHAVIOR`,
    `• The identified problem is resolved`,
    `• Adjacent behavior is unaffected`,
    `• Validation passes without manual workarounds`,
    ``,
    `INPUTS / OUTPUTS`,
    `Input:  Message routed through /api/chat or /api/telegram/inbound`,
    `Output: Correct intent classification + appropriate handler response`,
    ``,
    `AFFECTED SYSTEM AREA`,
    area,
    ``,
    `ACCEPTANCE CRITERIA`,
    `1. Task requirement met as described`,
    `2. node --check server.js exits 0`,
    `3. Relevant /api/chat test cases pass`,
    `4. No new jobs created as side effect`,
    `5. No regressions in prior validated behavior`,
    ``,
    `No job created. No ledger modified. Refinement complete.`,
  ]

  return { replyText: lines.join('\n'), replyKind: 'system', job: null }
}

function handleExecutionPacket(message) {
  return {
    replyText: 'Nettie: Execution is routed through the selected executor.',
    replyKind: 'system',
    job: null,
  }
}

function loadIRLState() {
  try {
    if (!fs.existsSync(IRL_STATE_FILE)) return null
    const parsed = JSON.parse(fs.readFileSync(IRL_STATE_FILE, 'utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch (err) {
    console.warn('Failed to load IRL state:', err.message)
    return null
  }
}

function saveIRLState() {
  try {
    fs.mkdirSync(runtimeDir, { recursive: true })
    fs.writeFileSync(IRL_STATE_FILE, JSON.stringify(instructionRegistry, null, 2))
  } catch (err) {
    console.warn('Failed to save IRL state:', err.message)
  }
}

function hasActiveIRLRule(domain, intent) {
  const normIntent = normalizeTaskKey(intent)
  return (instructionRegistry[domain] || []).some((rule) => rule.status === 'active' && normalizeTaskKey(rule.intent) === normIntent)
}

function ensureActiveIRLRule(ruleConfig) {
  if (hasActiveIRLRule(ruleConfig.domain, ruleConfig.intent)) return false
  const result = reconcileInstructions(ruleConfig, instructionRegistry)
  Object.assign(instructionRegistry, result.canonicalInstructionSet)
  saveIRLState()
  return true
}

if (process.env.MC_SKIP_REQUIRED_IRL_RULES !== '1') {
  ensureActiveIRLRule(HERMES_ROUTING_RULE)
}

function getIRLSnapshot() {
  const activeRules = Object.fromEntries(
    PRIORITY_DOMAINS.map(domain => [domain, (instructionRegistry[domain] || []).filter(r => r.status === 'active')])
  )
  const deprecatedRules = Object.fromEntries(
    PRIORITY_DOMAINS.map(domain => [domain, (instructionRegistry[domain] || []).filter(r => r.status === 'deprecated')])
  )
  return {
    domains: PRIORITY_DOMAINS,
    counts: Object.fromEntries(
      PRIORITY_DOMAINS.map(domain => [domain, {
        total: (instructionRegistry[domain] || []).length,
        active: activeRules[domain].length,
        deprecated: deprecatedRules[domain].length,
      }])
    ),
    activeRules,
    deprecatedRules,
    changelog: (instructionRegistry._changelog || []).slice(-50),
  }
}

function applyToIRL(message, domain) {
  const result = reconcileInstructions(
    { domain, rule: message.trim().slice(0, 120), intent: message.trim().slice(0, 80), source: 'Patrick' },
    instructionRegistry
  )
  Object.assign(instructionRegistry, result.canonicalInstructionSet)
  saveIRLState()
  return result
}

function handleControlDirective(message) {
  const msg = message.toLowerCase()

  const STRUCTURED_PLAN_RE = /\b(approval plan|approval plans|active execution|expand|for each job)\b|provide.*\bplan\b|\bprovide.*\bjob id\b/
  const ANALYSIS_RE = /\b(provide|analyze|analyse|summarize|summarise|review|generate plan)\b/
  const operationalInspection = isOperationalInspectionDirective(message)

  if (STRUCTURED_PLAN_RE.test(msg)) {
    const running = jobsLedger.filter(j => j.status === 'running')

    const riskFor = (task) => {
      const t = String(task || '').toLowerCase()
      if (/fix|patch|routing|classification|intent/.test(t)) return 'Medium — modifies core routing logic; regression possible'
      if (/delete|cancel|remove|drop/.test(t)) return 'High — destructive operation; irreversible without ledger backup'
      if (/feature|build|create|add/.test(t)) return 'Low — additive change; no existing behavior removed'
      return 'Low — no destructive side effects identified'
    }

    const planFor = (task) => {
      const t = String(task || '').toLowerCase()
      if (/fix|patch/.test(t)) return '1. Identify affected function\n2. Apply minimal targeted patch\n3. Restart server\n4. Run validation suite'
      if (/feature|build|create/.test(t)) return '1. Define scope and acceptance criteria\n2. Implement in isolation\n3. Test against existing behavior\n4. Merge and verify'
      return '1. Confirm task scope with Patrick\n2. Execute in staged steps\n3. Validate after each step\n4. Report completion'
    }

    const filesFor = (task) => {
      const t = String(task || '').toLowerCase()
      if (/routing|intent|brief|ledger|classification/.test(t)) return 'server.js — detectIntent(), handleNettieInbound(), handleOperationalBrief()'
      if (/ui|frontend|nettie page|chat/.test(t)) return 'src/pages/Nettie.jsx, src/pages/Operations.jsx'
      if (/dispatch|queue/.test(t)) return 'server.js — handleDispatchQueue(), handleLedgerCleanup()'
      return 'TBD — requires task scoping'
    }

    const separator = '--------------------------------'
    const blocks = running.map(j => {
      const task = String(j.task || '').slice(0, 120)
      return [
        separator,
        `Job ID: ${j.id}`,
        `Task Summary: ${task}`,
        ``,
        `Problem:`,
        `This job was queued to address a known system issue. Current code has been patched; job may be superseded.`,
        ``,
        `Proposed Plan:`,
        planFor(task),
        ``,
        `Files / Functions Impacted:`,
        filesFor(task),
        ``,
        `Risk Level:`,
        riskFor(task),
        ``,
        `Validation Steps:`,
        `1. Run node --check server.js\n2. POST test message to /api/chat\n3. Confirm intent routes correctly\n4. Confirm no jobs created as side effect`,
        ``,
        `Recommendation:`,
        `Revise or cancel — task appears superseded by recent patches. Confirm with Patrick before re-executing.`,
      ].join('\n')
    })

    if (blocks.length === 0) blocks.push(`${separator}\nNo running jobs found. Nothing to plan.`)
    blocks.push(separator)

    const body = [`Nettie: Active Execution Approval Plans — ${running.length} running job(s)\n`, ...blocks, `\nNo jobs modified. Awaiting Patrick's directive.`].join('\n')
    return { replyText: body, replyKind: 'system', job: null }
  }

  if (ANALYSIS_RE.test(msg) && operationalInspection) {
    const running = jobsLedger.filter(j => j.status === 'running')
    const queued  = jobsLedger.filter(j => j.status === 'queued')
    const fmt = (jobs) => jobs.length
      ? jobs.map(j => `  ${j.id}: ${String(j.task || '').slice(0, 65)} [${j.agent || 'Van'}]`).join('\n')
      : '  none'
    const body = [
      `Nettie: Internal analysis — "${message.trim()}"`,
      ``,
      `Running (${running.length}):`,
      fmt(running),
      ``,
      `Queued (${queued.length}):`,
      fmt(queued),
      ``,
      `No job created. Analysis complete.`,
    ].join('\n')
    return { replyText: body, replyKind: 'system', job: null }
  }

  return {
    replyText: `Nettie: Control directive received — "${message.trim()}". No job created, no execution queued. Awaiting the next instruction.`,
    replyKind: 'system',
    job: null,
  }
}

function handleSystemUpdate(message) {
  applyToIRL(message, 'routing')
  return {
    replyText: "Nettie: System-update request detected. This requires code patch execution through the selected executor until MC self-modification is enabled. No job created.",
    replyKind: "system",
    job: null
  }
}

function handleExecutionCommand(message) {
  return {
    replyText: 'Nettie: Execution is routed through the selected executor.',
    replyKind: 'system',
    job: null,
  }
}

function findJobById(jobId) {
  return jobStore.getJobById(jobId)
}

function handleJobStatus(message) {
  const match = message.match(JOB_ID_RE)
  const jobId = match?.[0]
  if (!jobId) return { replyText: 'Nettie: No job ID found in message.', replyKind: 'status' }
  const job = findJobById(jobId)
  if (!job) return { replyText: `Nettie: ${jobId} not found in ledger.`, replyKind: 'status' }
  const task = job.task || job.title || '?'
  const agent = job.agent || job.owner || '?'
  const updated = (job.updatedAt || job.createdAt || '?').slice(0, 16)
  return {
    replyText: `Nettie: ${jobId} — "${task}" [${job.status}] → ${agent}. Last updated: ${updated}.`,
    replyKind: 'status',
  }
}

function handleJobExecution(message) {
  const match = message.match(JOB_ID_RE)
  const jobId = match?.[0]
  if (!jobId) return { replyText: 'Nettie: No job ID found in message.', replyKind: 'status' }
  const job = findJobById(jobId)
  if (!job) return { replyText: `Nettie: ${jobId} not found in ledger.`, replyKind: 'status' }
  const msg = message.toLowerCase()
  const newStatus = /\b(resume|restart|continue)\b/.test(msg) ? 'queued' : 'running'
  updateJobStatus(jobId, newStatus)
  const stateJob = state.jobs.find(j => j.id === jobId)
  if (stateJob) { stateJob.status = newStatus; stateJob.updatedAt = nowIso() }
  setImmediate(() => syncRecoveryLedger())
  log('info', `Job execution: ${jobId} → ${newStatus}`)
  return {
    replyText: `Nettie: ${jobId} status set to ${newStatus}. Task: "${job.task || job.title || '?'}" → ${job.agent || job.owner || '?'}.`,
    replyKind: 'system',
    job: findJobById(jobId),
  }
}

function handleCIQuery(message) {
  const register = loadCIRegister()
  const open = (register.entries || []).filter(e => e.status === 'open').sort((a, b) => b.score - a.score)
  if (!open.length) return { replyText: 'Nettie: CI register is clean — no open improvement items.', replyKind: 'status' }
  const top = open.slice(0, 6).map(e => `  • [${e.score}] ${e.id}: ${e.title} (${e.type}, freq:${e.frequency})`)
  return {
    replyText: `Nettie: CI register — ${open.length} open item(s). Top priorities:\n${top.join('\n')}\nFile: shared-ledger/ci-register.md`,
    replyKind: 'status',
  }
}

function isExecutorStatusQuery(message = '') {
  const text = String(message || '').trim().toLowerCase()
  if (!text) return false
  return /\b(executor|bridge|fallback|route)\b/.test(text)
    && /\b(status|current|live|confirm|connected|cooling|cooldown|available|availability|ready)\b/.test(text)
}

function handleExecutorStatus() {
  const status = buildExecutorBridgeStatus()
  const fallbackLine = status.fallback?.available
    ? `${status.fallback.executor} (${status.fallback.mode}${status.fallback.autoRoutable ? ', auto-routable' : ''})`
    : 'none'
  const lines = [
    'Nettie: Executor status.',
    `Bridge: ${status.bridgeConnected ? 'connected' : 'unavailable'}`,
    `Primary route: ${status.selectedExecutor || status.executor || 'unavailable'}`,
    `Executor ready: ${status.executorReady ? 'yes' : 'no'}`,
    `Cooling down: ${status.executorCoolingDown ? 'yes' : 'no'}`,
    `Fallback: ${fallbackLine}`,
    `Queue depth: ${status.queueDepth || 0}`,
  ]
  if (status.cooldown?.estimatedResetTime) lines.push(`Cooldown ETA: ${status.cooldown.estimatedResetTime}`)
  if (status.lastError?.message) lines.push(`Last error: ${status.lastError.message}`)
  return { replyText: lines.join('\n'), replyKind: 'status' }
}

const JOB_ID_RE = /\bjob_[a-f0-9]{8}\b/i

const GLOBAL_INSPECTION_PATTERNS = [
  /show me all running jobs/i,
  /what jobs are queued/i,
  /list all active jobs/i,
  /show job ledger status/i,
  /what is (?:van|hermes) working on/i,
  /show all jobs/i,
  /show current job status/i,
  /what is in the job registry/i,
  /what is currently running/i,
  /(?:job registry|job ledger|master work registry)/i,
]

function isOperationalInspectionDirective(message = '') {
  const text = String(message || '').trim()
  if (!text) return false
  if (JOB_ID_RE.test(text)) return true
  const lower = text.toLowerCase()
  const inspectionVerb = /\b(show|list|inspect|audit|report|review|analyze|analyse|summarize|summarise|provide)\b/.test(lower)
  const operationalTarget = /\b(job|jobs|queue|queued|running|ledger|registry|active work|blocked|completed|cancelled)\b/.test(lower)
  return inspectionVerb && operationalTarget
}

function isGlobalInspectionQuery(message = '') {
  const text = String(message || '').trim()
  if (!text) return false
  if (JOB_ID_RE.test(text)) return false
  if (GLOBAL_INSPECTION_PATTERNS.some((pattern) => pattern.test(text))) return true

  const lower = text.toLowerCase()
  const hasRegistrySignal = /\b(jobs?|job registry|job ledger|registry|ledger|running|queued|blocked|completed|cancelled|status)\b/.test(lower)
  const hasInspectionVerb = /\b(show|list|inspect|report|what|status)\b/.test(lower)
  return hasRegistrySignal && hasInspectionVerb
}

function extractInspectionTarget(message = '') {
  const text = String(message || '')
  const explicit = text.match(/\b(?:what is|show|status of|report on|working on)\s+(van|hermes)\b/i)
  if (explicit?.[1]) return explicit[1].toLowerCase() === 'hermes' ? 'Hermes' : 'Van'

  const agent = state.agents.find((entry) => new RegExp(`\\b${entry.name}\\b`, 'i').test(text))
  return agent?.name || ''
}

function recommendationForInspectionJob(job = {}) {
  const status = String(job.status || '').toLowerCase()
  if (status === 'running') return 'Monitor progress and keep the lane clear'
  if (status === 'queued') return job.routeStatus?.includes('awaiting') ? 'Approve or route to execution' : 'Dispatch when capacity opens'
  if (status === 'blocked') return job.nextAction || job.resumeCommand || job.outageReason || 'Resolve blocker before resuming'
  if (status === 'paused') return job.resumeCommand || 'Resume or cancel'
  if (status === 'completed') return 'Review result and close out'
  if (status === 'cancelled') return 'No action — archived'
  return 'Review and decide next step'
}

function formatInspectionJob(job = {}) {
  const id = job.jobId || job.id || 'n/a'
  const task = String(job.task || job.title || 'Untitled mission').slice(0, 70)
  const owner = job.agent || job.owner || 'Unassigned'
  const status = job.status || 'unknown'
  const route = job.routeStatus ? ` | route: ${job.routeStatus}` : ''
  const source = job.source ? ` | source: ${job.source}` : ''
  return `- ${id} | ${owner} | ${status}${route}${source} | ${task} | action: ${recommendationForInspectionJob(job)}`
}

function buildInspectionSection(label, jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) return `${label} (0)\n  No matching jobs.`
  return `${label} (${jobs.length})\n${jobs.slice(0, 8).map(formatInspectionJob).join('\n')}`
}

function handleGlobalInspection(message = '') {
  const registry = buildMasterWorkRegistry()
  const target = extractInspectionTarget(message)
  const focusedMatches = target ? queryWorkStatus(target).matches : []
  const focusLabel = target ? `${target} focus` : 'job registry'

  const dedupeById = (items = []) => Array.from(new Map((items || []).map((job) => [job.jobId || job.id, job])).values())

  const sourceJobs = focusedMatches.length
    ? dedupeById(focusedMatches)
    : dedupeById([
        ...registry.active,
        ...registry.running,
        ...registry.queued,
        ...registry.blocked,
        ...registry.paused,
        ...registry.completedRecent,
      ])

  const running = sourceJobs.filter((job) => String(job.status || '').toLowerCase() === 'running')
  const queued = sourceJobs.filter((job) => String(job.status || '').toLowerCase() === 'queued')
  const blocked = sourceJobs.filter((job) => String(job.status || '').toLowerCase() === 'blocked')
  const completedRecent = focusedMatches.length ? dedupeById(focusedMatches).filter((job) => String(job.status || '').toLowerCase() === 'completed') : registry.completedRecent
  const cancelled = jobsLedger
    .filter((job) => String(job.status || '').toLowerCase() === 'cancelled')
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))

  const active = focusedMatches.length ? focusedMatches.filter((job) => !['completed', 'cancelled'].includes(String(job.status || '').toLowerCase())) : registry.active
  const summary = [
    `Active: ${active.length}`,
    `Running: ${running.length}`,
    `Queued: ${queued.length}`,
    `Blocked: ${blocked.length}`,
    `Completed recent: ${completedRecent.length}`,
    `Cancelled: ${cancelled.length}`,
  ].join(' | ')

  const attention = []
  if (blocked.length > 0) attention.push(`Resolve ${blocked.length} blocked job(s)`)
  if (queued.length > 0 && running.length === 0) attention.push('Dispatch queued work — nothing is currently running')
  if (target) attention.push(`Focus on ${target} assignments before broadening scope`)
  if (attention.length === 0) attention.push('No immediate operator action required')

  const sections = [
    `Nettie: Global Inspection — ${focusLabel}`,
    `Summary: ${summary}`,
    '',
    buildInspectionSection('Running jobs', running),
    '',
    buildInspectionSection('Queued jobs', queued),
    '',
    buildInspectionSection('Blocked jobs', blocked),
    '',
    buildInspectionSection('Recently completed jobs', completedRecent),
    '',
    buildInspectionSection('Cancelled jobs', cancelled),
    '',
    `Recommended operator action: ${attention.join(' | ')}`,
  ]

  return {
    replyText: sections.join('\n'),
    replyKind: 'briefing',
  }
}

function recordIntentAudit(entry) {
  intentAuditLog.push({
    timestamp: new Date().toISOString(),
    message: entry.message,
    scoped: entry.scoped,
    scores: entry.scores,
    selected: entry.selected,
    runnerUp: entry.runnerUp,
    confidenceGap: entry.confidenceGap,
  })
  if (intentAuditLog.length > 5000) intentAuditLog.shift()
}

function scoreIntent(message) {
  const msg = message.toLowerCase()
  return {
    refinement:
      (msg.includes('refine') ? 3 : 0) +
      (msg.includes('clarify') ? 3 : 0) +
      (msg.includes('scope') ? 2 : 0) +
      (msg.includes('job') ? 1 : 0),
    creation:
      (msg.includes('create job') ? 5 : 0) +
      (msg.includes('new job') ? 4 : 0) +
      (msg.includes('add job') ? 4 : 0),
    execution:
      (msg.includes('execution packet') ? 5 : 0),
    status:
      (msg.includes('status') ? 4 : 0) +
      (msg.includes('job_') ? 3 : 0),
  }
}

function resolveIntent(scores) {
  const entries = Object.entries(scores)
  const sorted = entries.sort((a, b) => b[1] - a[1])

  const top = sorted[0]
  const second = sorted[1]

  const topScore = top[1]
  const secondScore = second ? second[1] : 0
  const topType = top[0]

  // SAFETY RULE 1: no signal → question
  if (topScore === 0) return 'question'

  // SAFETY RULE 2: ambiguity collision → question
  if (topScore === secondScore) return 'question'

  return topType
}

function detectIntent(message) {
  const msg = message.toLowerCase()

  // SCOPED SCORING: only for Nettie-prefixed commands, threshold ≥ 3 prevents weak-signal hijack
  if (/^nettie\s*[—–,\-]/i.test(message.trim())) {
    const scores = scoreIntent(message)
    const max = Math.max(scores.refinement, scores.creation, scores.execution, scores.status)
    if (max >= 3) {
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
      const selected = sorted[0][0]
      const runnerUp = sorted[1] ? sorted[1][0] : null
      const confidenceGap = sorted[1] ? sorted[0][1] - sorted[1][1] : sorted[0][1]
      recordIntentAudit({ message, scoped: true, scores, selected, runnerUp, confidenceGap })
      if (scores.refinement === max) return 'job_refinement_directive'
      if (scores.creation === max) return 'job_creation_directive'
      if (scores.execution === max) return 'execution_packet_directive'
      if (scores.status === max) return isExecutorStatusQuery(message) ? 'executor_status' : 'status_query'
    }
  }

  // FALLBACK Nettie-prefix regex guards (catch max < 3 cases)
  if (
    /^nettie\s*[—–,\-]/i.test(message.trim()) &&
    /\b(hold|pause|stop|wait|do not|convert|approval)\b/.test(msg)
  ) return 'control_directive'
  if (/^nettie\s*[—–,\-]/i.test(message.trim()) && isOperationalInspectionDirective(message)) return 'control_directive'

  // PRIORITY 1: self-referential system-update requests — never create jobs
  if (
    /\b(fix|update|add|modify|patch|implement)\b/.test(msg) &&
    /\b(routing|intent|handler|server|classification|logic|regex|detectintent|handlenettieinbound)\b/.test(msg)
  ) return 'system_update'

  // HARD PRIORITY: placeholder/generic job references → execution_command, not job_status
  if (/\bjob_(x|id|test)\b/i.test(msg)) return 'execution_command'
  if (/\b(fix|update|enforce|add|implement|patch)\b/.test(msg)) return 'execution_command'

  // HARD PRIORITY: real job IDs only (8-char hex)
  if (/\b(start|run|resume|restart|continue)\b/.test(msg) && JOB_ID_RE.test(msg)) return 'job_execution'
  if (JOB_ID_RE.test(msg)) return 'job_status'

  // PRIORITY 2: explicit execution routing (no job ID)
  if (/^(route to \w+:|convert to execution task:|this is a system change:|create a job:)/i.test(message.trim())
    || /\bfix\s+(the\s+)?(operational|system|ledger|routing|detection|brief|ci|nettie|hermes|intent|dedupe|outage)/i.test(message)) return 'execution_command'

  // PRIORITY 3: CI queries
  if (/\b(ci register|continuous improvement|show improvements|what improved|improvement items|ci priorities)\b/.test(msg)) return 'ci_query'

  // PRIORITY 4: operational brief — guarded: only fires when NO job ID present (already handled above)
  if (/\b(operational brief|full brief|brief me|company brief|exec brief)\b/.test(msg)) return 'operational_brief'
  if (/\b(active|running|queued).{0,60}\b(blocked|attention|immediate)\b/.test(msg)) return 'operational_brief'

  // PRIORITY 5: recovery/outage queries
  if (/\b(recovery ledger|show recovery|what is blocked|what is active|what needs resumed|outage|token outage)\b/.test(msg)) return 'recovery_query'

  // PRIORITY 5.5: explicit executor / bridge / fallback status
  if (isExecutorStatusQuery(message)) return 'executor_status'

  // PRIORITY 6a.5: registry-wide inspection — never requires job ID
  if (isGlobalInspectionQuery(message)) return 'global_inspection'

  // PRIORITY 6a: ledger dispatch
  if (/\bdispatch\s+queue\b|\bqueue\s+dispatch\b/.test(msg)) return 'dispatch_queue'

  // PRIORITY 6b: ledger cleanup
  if (/\bcleanup\s+ledger\b|\bclean\s+(up\s+)?ledger\b|\bledger\s+cleanup\b/.test(msg)) return 'cleanup_ledger'

  // PRIORITY 6b: control commands (mark complete — no job ID required, uses pattern)
  if (/\bmark\s+\S+\s+(complete|done|failed)\b/.test(msg)) return 'control_command'
  if (/\b(pause|stop|cancel|halt)\b/.test(msg)) return 'control_command'

  // PRIORITY 7: assignment
  if (/\b(assign|work on|build|create|launch|start|have [a-z]+ (work|build|create|do)|tell [a-z]+ to)\b/.test(msg)) return 'assign_task'

  // PRIORITY 8: general status
  if (/who('?s| is)? available|available agents|agent registry|what are they responsible for|responsible for|who handles/.test(msg)) return 'status_query'
  if (/\b(show|list|active work|what.*working|running|jobs|ledger|status|what.*(doing|running|on)|where are we with|company wide)\b/.test(msg)) return 'status_query'

  return 'chat'
}

function extractTask(message) {
  const patterns = [
    /work on (.+)/i, /build (.+)/i, /create (.+)/i, /launch (.+)/i,
    /have \w+ work on (.+)/i, /have \w+ build (.+)/i, /have \w+ create (.+)/i,
    /tell \w+ to (.+)/i, /assign (.+?) to \w/i, /assign (.+)/i,
  ]
  for (const re of patterns) {
    const m = message.match(re)
    if (m) return m[1].replace(/[.!?]+$/, '').trim()
  }
  return message.trim()
}

function extractAgent(message) {
  const lower = message.toLowerCase()
  const aliases = {
    van: 'Van',
    perry: 'Perry',
    torina: 'Torina',
    scribe: 'Scribe',
    dana: 'Dana',
    ivy: 'Funboy',
    funboy: 'Funboy',
    rab: 'Rab',
    nettie: 'Nettie',
    bea: 'Bea',
  }

  for (const [alias, agentName] of Object.entries(aliases)) {
    if (lower.includes(alias)) return agentName
  }

  for (const agent of getAgentRegistryView()) {
    if (lower.includes(agent.displayName.toLowerCase())) return agent.displayName
  }
  return guessOwner(message)
}

function isAgentDirectCallable(agentName) {
  if (!agentName) return false
  if (agentName === 'Nettie') return hermesAvailable
  return false
}

function createMissionStateJob({ id, task, owner, description, status = 'queued', routeStatus = 'queued', priority = 'P1' }) {
  const createdAt = nowIso()
  const result = saveJob({
    id,
    task,
    title: task,
    owner,
    agent: owner,
    department: owner,
    priority,
    stage: status === 'running' ? 'IN_PROGRESS' : 'SCOPED',
    status,
    routeStatus,
    description,
    sourceType: 'mission-control',
    source: 'mission-control',
    workerId: null,
    createdAt,
    updatedAt: createdAt,
  })
  return {
    ...jobStore.toMissionStateJob(result),
    description,
  }
}

function handleAssignment(message, source = 'mission-control') {
  const task = extractTask(message)
  const agent = extractAgent(message)
  const readiness = validateDepartmentHeadRoutingReadiness(agent, task, { task, text: message, assignedDepartmentHead: agent })

  if (!readiness.ok) {
    const correction = createDocumentationLockJob(agent, task, readiness.missing, source)
    log('warn', `Routing lock: ${readiness.canonical} requires documentation/readiness before task routing (${readiness.missing.join(', ')})`)
    return {
      replyText: `Nettie: Routing blocked for ${readiness.canonical}. Corrective documentation task created first. Missing: ${readiness.missing.join(', ')}. Job ID: ${correction.ledgerJob.id}.`,
      replyKind: 'system',
      job: correction.ledgerJob,
      missionJob: correction.missionJob,
      directCallable: false,
      deduped: false,
    }
  }

  const canonicalAgent = readiness.canonical
  const directCallable = isAgentDirectCallable(canonicalAgent)
  const routeStatus = directCallable ? 'ready' : `awaiting-${canonicalAgent.toLowerCase()}-route`
  const status = 'queued'

  const duplicate = findOpenDuplicateJob(canonicalAgent, task)
  if (duplicate) {
    duplicate.updatedAt = nowIso()
    duplicate.source = duplicate.source || source
    if (!duplicate.routeStatus) duplicate.routeStatus = routeStatus
    saveJob(duplicate)

    const missionJob = state.jobs.find((job) => job.id === duplicate.id) || createMissionStateJob({
      id: duplicate.id,
      task,
      owner: canonicalAgent,
      description: message,
      status,
      routeStatus,
      priority: guessPriority(message),
    })
    missionJob.updatedAt = nowIso()

    log('info', `Ledger dedupe: ${duplicate.id} reused for "${task}" → ${canonicalAgent}`)
    return {
      replyText: `Nettie: Existing open job found for ${canonicalAgent}. Reusing ${duplicate.id} for "${task}". Status: ${duplicate.status}${duplicate.routeStatus ? ` (${duplicate.routeStatus})` : ''}.`,
      replyKind: 'system',
      job: duplicate,
      missionJob,
      directCallable,
      deduped: true,
    }
  }

  const ledgerJob = saveJob({
    id: `job_${crypto.randomUUID().slice(0, 8)}`,
    agent: canonicalAgent,
    task,
    status,
    routeStatus,
    source,
    inputPayload: {
      assignedDepartmentHead: canonicalAgent,
      governingRunbook: readiness.governingRunbook,
      task,
      text: message,
      qaPath: canonicalAgent === 'Perry' ? 'Perry' : 'Perry -> Nettie',
      outputFormat: 'file-backed handoff packet',
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  })

  const missionJob = createMissionStateJob({
    id: ledgerJob.id,
    task,
    owner: canonicalAgent,
    description: message,
    status,
    routeStatus,
    priority: guessPriority(message),
  })

  log('info', `Ledger: ${ledgerJob.id} created — "${task}" → ${canonicalAgent} (${routeStatus})`)

  if (!directCallable) {
    return {
      replyText: `Nettie: Job created and queued for ${canonicalAgent}: ${task}. Status: queued (awaiting ${canonicalAgent} route). Job ID: ${ledgerJob.id}.`,
      replyKind: 'system',
      job: ledgerJob,
      missionJob,
      directCallable,
      deduped: false,
    }
  }

  return {
    replyText: `Nettie: Job created for ${canonicalAgent}: ${task}. Status: queued. Job ID: ${ledgerJob.id}.`,
    replyKind: 'system',
    job: ledgerJob,
    missionJob,
    directCallable,
    deduped: false,
  }
}

function formatRegistryLine(job) {
  const task = job.task || job.title || 'Untitled mission'
  const agent = job.agent || job.owner || 'Nettie'
  const route = job.routeStatus ? `, ${job.routeStatus}` : ''
  return `• ${job.id}: ${task} [${job.status}${route}] → ${agent}`
}

function extractProjectQuery(message = '') {
  const m = String(message || '').match(/(?:where are we with|status of|update on)\s+(.+)$/i)
  if (!m) return ''
  return m[1].replace(/[?.!]+$/, '').trim()
}

function handleStatus(message = '') {
  if (isAgentAvailabilityQuery(message)) {
    return {
      replyText: buildAgentAvailabilityBrief(getAgentRegistryView()),
      replyKind: 'status',
    }
  }

  const projectQuery = extractProjectQuery(message)
  if (projectQuery) {
    const lookup = queryWorkStatus(projectQuery)
    if (!lookup.matches.length) {
      return {
        replyText: `Nettie: No matching work-state found for "${projectQuery}" across the master work registry.`,
        replyKind: 'status',
      }
    }
    const lines = lookup.matches.slice(0, 8).map(formatRegistryLine)
    return {
      replyText: `Nettie: Work status for ${projectQuery} (${lookup.matches.length}):\n${lines.join('\n')}`,
      replyKind: 'status',
    }
  }

  const registry = buildMasterWorkRegistry()
  const lines = [
    `Active (${registry.active.length})`,
    `Queued (${registry.queued.length})`,
    `Running (${registry.running.length})`,
    `Paused (${registry.paused.length})`,
    `Blocked (${registry.blocked.length})`,
    `Completed recent (${registry.completedRecent.length})`,
  ]
  const topActive = registry.active.slice(0, 6).map(formatRegistryLine)
  const details = topActive.length ? `\nTop active:\n${topActive.join('\n')}` : ''
  return {
    replyText: `Nettie: Master Work Registry summary — ${lines.join(' | ')}.${details}`,
    replyKind: 'status',
  }
}

function handleRecoveryQuery(message) {
  const ledger = loadRecoveryLedger() || syncRecoveryLedger()
  const entries = ledger?.entries || []
  const msg = message.toLowerCase()

  if (/blocked/.test(msg)) {
    const blocked = entries.filter(e => e.status === 'blocked')
    if (!blocked.length) return { replyText: 'Nettie: No blocked jobs in recovery ledger.', replyKind: 'status' }
    const lines = blocked.map(e => `• ${e.jobId}: ${e.task.slice(0, 50)} [${e.outageReason || 'unknown reason'}] → ${e.nextAction || 'unresolved'}`)
    return { replyText: `Nettie: Blocked jobs (${blocked.length}):\n${lines.join('\n')}`, replyKind: 'status' }
  }

  if (/resume|needs resumed/.test(msg)) {
    const resumable = entries.filter(e => ['blocked', 'paused'].includes(e.status) && e.resumeCommand)
    if (!resumable.length) return { replyText: 'Nettie: No paused/blocked jobs with resume commands found.', replyKind: 'status' }
    const lines = resumable.map(e => `• ${e.jobId}: ${e.task.slice(0, 40)}\n  Resume: ${e.resumeCommand?.slice(0, 80)}`)
    return { replyText: `Nettie: Jobs needing resume (${resumable.length}):\n${lines.join('\n')}`, replyKind: 'status' }
  }

  if (/outage/.test(msg)) {
    const outaged = entries.filter(e => e.providerOutage)
    if (!outaged.length) return { replyText: 'Nettie: No executor outage flags in recovery ledger.', replyKind: 'status' }
    const lines = outaged.map(e => `• ${e.jobId}: ${e.task.slice(0, 50)} — ${e.outageReason || 'outage flagged'}`)
    return { replyText: `Nettie: Provider outage jobs (${outaged.length}):\n${lines.join('\n')}`, replyKind: 'status' }
  }

  // Default: full summary
  const byStatus = { active: 0, blocked: 0, paused: 0, queued: 0, completed: 0, failed: 0 }
  for (const e of entries) {
    const bucket = ['running', 'in_progress', 'assigned'].includes(e.status) ? 'active' : (byStatus[e.status] !== undefined ? e.status : 'active')
    byStatus[bucket]++
  }
  const summary = Object.entries(byStatus).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' | ')
  const top = entries.filter(e => !['completed', 'cancelled'].includes(e.status)).slice(0, 5).map(e => `• ${e.jobId}: ${e.task.slice(0, 45)} [${e.status}] → ${e.owner}`)
  return {
    replyText: `Nettie: Recovery ledger — ${summary}. Total: ${entries.length}\n${top.join('\n')}\nFile: shared-ledger/work-recovery-ledger.md`,
    replyKind: 'status',
  }
}

function handleOperationalBrief() {
  const registry = buildMasterWorkRegistry()
  const ledger = loadRecoveryLedger() || syncRecoveryLedger()
  const outaged = (ledger?.entries || []).filter(e => e.providerOutage)

  const fmt = (jobs, n = 6) => jobs.slice(0, n)
    .map(j => `  • ${j.id || j.jobId}: ${String(j.task || j.title || '?').slice(0, 52)} [${j.status}] → ${j.agent || j.owner || '?'}`)
    .join('\n') || '  none'

  // Immediate attention heuristics
  const attention = []
  if (registry.running.length === 0) attention.push('No jobs currently running — execution is stalled')
  if (registry.blocked.length > 0) attention.push(`${registry.blocked.length} blocked job(s) need resolution`)
  if (outaged.length > 0) attention.push(`${outaged.length} executor outage flag(s) — check resumeCommand in recovery ledger`)
  const vanQueued = registry.queued.filter(j => (j.agent || j.owner || '') === 'Van').length
  if (vanQueued > 5) attention.push(`Van holds ${vanQueued} queued jobs — consider redistributing or triggering execution`)
  if (attention.length === 0) attention.push('No critical issues detected')

  const sections = [
    `Nettie: Operational Brief — ${nowIso().slice(0, 16)} UTC`,
    '',
    `RUNNING (${registry.running.length})`,
    fmt(registry.running),
    '',
    `QUEUED (${registry.queued.length})`,
    fmt(registry.queued),
    '',
    `BLOCKED (${registry.blocked.length}) — cancelled jobs excluded`,
    fmt(registry.blocked),
    '',
    outaged.length ? `PROVIDER OUTAGE FLAGS (${outaged.length})\n${outaged.slice(0,4).map(e => `  • ${e.jobId}: ${e.task.slice(0,45)} — ${e.outageReason||'outage flagged'}`).join('\n')}` : 'PROVIDER OUTAGE FLAGS: none',
    '',
    `IMMEDIATE ATTENTION`,
    attention.map(a => `  ⚡ ${a}`).join('\n'),
  ]

  return { replyText: sections.join('\n'), replyKind: 'briefing' }
}

function handleDispatchQueue() {
  const MAX_RUNNING = 3
  const currentRunning = jobsLedger.filter(j => j.status === 'running')
  const slots = Math.max(0, MAX_RUNNING - currentRunning.length)

  if (slots === 0) {
    return {
      replyText: `Nettie: Concurrency cap reached — ${currentRunning.length} jobs already running. No dispatch.`,
      replyKind: 'system'
    }
  }

  const candidates = jobsLedger.filter(j => j.status === 'queued').slice(0, slots)

  if (candidates.length === 0) {
    return { replyText: 'Nettie: No queued jobs available for dispatch.', replyKind: 'system' }
  }

  const dispatched = []
  for (const job of candidates) {
    job.status = 'running'
    job.routeStatus = 'running'
    job.executionStart = nowIso()
    job.updatedAt = nowIso()
    job.agent = job.agent || 'Van'
    const stateJob = state.jobs.find(e => e.id === job.id)
    if (stateJob) {
      stateJob.status = 'running'
      stateJob.routeStatus = 'running'
      stateJob.stage = 'IN_PROGRESS'
      stateJob.updatedAt = job.updatedAt
    }
    dispatched.push(job.id)
  }
  saveJobsLedger()
  refreshDerivedState()

  const newRunning = jobsLedger.filter(j => j.status === 'running').length
  const newQueued  = jobsLedger.filter(j => j.status === 'queued').length

  const lines = [
    `Nettie: Dispatch complete.`,
    ``,
    `Dispatched (${dispatched.length}):`,
    dispatched.map(id => `  • ${id} → Van [running]`).join('\n'),
    ``,
    `Running now: ${newRunning}`,
    `Remaining queued: ${newQueued}`,
  ]
  return { replyText: lines.join('\n'), replyKind: 'system' }
}

function handleLedgerCleanup() {
  const PLACEHOLDER_RE = /\bjob_(x|id|test|xxxxxxxx)\b/i
  const SYSTEM_FIX_RE = /\b(fix|patch|update)\b.{0,60}\b(routing|intent|classification|detection|brief|operational|placeholder|execution capability|misclassification)/i
  const VALIDATION_NOISE_RE = /\b(validation.probe|validation-dedupe|validation-check|test job \d|remaining \d+ iterations)/i
  const PROTECTED_IDS = new Set(['job-hermes-bridge', 'job-agent-routing'])
  const PROTECTED_TASK_RE = /\b(new feature|wire hermes|control agents|comss-mwd project locally)\b/i

  const queued = jobsLedger.filter(j => j.status === 'queued')
  const beforeCount = queued.length

  // Identify duplicates: group by normalized task, cancel all but the newest
  const taskGroups = new Map()
  for (const j of queued) {
    const key = normalizeTaskKey(j.task || j.title || '')
    if (!taskGroups.has(key)) taskGroups.set(key, [])
    taskGroups.get(key).push(j)
  }
  const duplicateIds = new Set()
  for (const [, group] of taskGroups) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => String(b.id).localeCompare(String(a.id)))
    for (const j of sorted.slice(1)) duplicateIds.add(j.id)
  }

  const cancelled = []
  const criteriaMap = {}

  for (const j of queued) {
    if (PROTECTED_IDS.has(j.id)) continue
    if (PROTECTED_TASK_RE.test(j.task || j.title || '')) continue

    const task = String(j.task || j.title || '')
    let reason = null

    if (PLACEHOLDER_RE.test(task)) reason = 'placeholder reference'
    else if (SYSTEM_FIX_RE.test(task)) reason = 'superseded system fix'
    else if (VALIDATION_NOISE_RE.test(task)) reason = 'validation/test noise'
    else if (duplicateIds.has(j.id)) reason = 'duplicate task'

    if (reason) {
      updateJobStatus(j.id, 'cancelled')
      cancelled.push(j.id)
      criteriaMap[j.id] = reason
    }
  }

  saveJobsLedger()

  const finalQueued = jobsLedger.filter(j => j.status === 'queued').length
  const lines = [
    `Nettie: Ledger cleanup complete.`,
    ``,
    `Before: ${beforeCount} queued`,
    `Cancelled: ${cancelled.length}`,
    cancelled.map(id => `  • ${id} — ${criteriaMap[id]}`).join('\n'),
    ``,
    `Final queued: ${finalQueued}`,
    `Running jobs: untouched`,
  ]
  return { replyText: lines.join('\n'), replyKind: 'system' }
}

function handleControl(message) {
  const match = message.match(/job_[a-f0-9]+/)
  const jobId = match?.[0]
  const lower = message.toLowerCase()
  const action = /resume|restart|continue/.test(lower) ? 'queued' : 'paused'
  if (jobId) {
    const job = updateJobStatus(jobId, action)
    if (!job) return { replyText: `Nettie: ${jobId} not found in ledger.`, replyKind: 'status' }
    return { replyText: `Nettie: ${job.id} ${action}. Task: "${job.task || job.title}" (${job.agent || job.owner}).`, replyKind: 'system' }
  }
  return { replyText: 'Nettie: Specify a job ID. Example: "pause job_abc123".', replyKind: 'status' }
}

function buildNettiePrompt(userMessage) {
  const registry = buildMasterWorkRegistry()
  const active = registry.active.slice(0, 8)
  const ledgerSummary = active.length
    ? active.map(formatRegistryLine).join('\n')
    : 'No active jobs in registry.'
  return [
    NETTIE_PERSONA,
    'Tone: direct executive command style. Keep response to 2-5 sentences unless listing active work.',
    `Current master work registry:\n${ledgerSummary}`,
    `Patrick: ${userMessage}`,
    'Reply as Nettie only. Never reference being Hermes/GPT/model/runtime.',
  ].join('\n\n')
}

function sanitizeNettieVoice(text = '') {
  const stripped = String(text)
    .replace(/\b(?:I am|I'm|As)\s+(?:Hermes|GPT|an AI model|a language model)\b/gi, 'I am Nettie')
    .replace(/\bHermes\b/g, 'Nettie')
    .trim()
  return stripped ? `Nettie: ${stripped.replace(/^Nettie:\s*/i, '')}` : 'Nettie: Command received. No executor response text was returned.'
}

function executorFailureReply(classification = {}, executor = 'executor') {
  const type = classification.type || classification.codexAuthStatus || 'unavailable'
  if (executor === 'codex' && type === 'auth') return 'Nettie: Codex auth error. Command preserved; no executor response rendered.'
  if (executor === 'codex') return `Nettie: Codex executor unavailable (${classification.message || type}). Command preserved.`
  if (executor === 'hermes') return `Nettie: Legacy Hermes unavailable for manual request (${classification.message || type}). Command preserved.`
  return `Nettie: No executor available (${classification.message || type}). Command preserved.`
}

function deterministicNettieReply(message = '') {
  const msg = String(message || '').toLowerCase()
  if (msg === 'ping') return 'Nettie: pong. Mission Control is online.'
  if (/\bconfirm\b.*\bcodex\b.*\bexecutor\b.*\bbridge\b.*\blive\b/.test(msg)) {
    return codexAvailable
      ? `Nettie: Codex executor bridge is live. Version: ${codexVersion || 'available'}. Fallback executor: none.`
      : 'Nettie: No executor available — Codex unavailable.'
  }
  if (/\bcodex\b.*\b(status|available|health)\b|\bexecutor\b.*\b(status|available|health)\b/.test(msg)) {
    return codexAvailable
      ? `Nettie: Codex executor available. Fallback executor: none. Legacy Hermes disabled for automatic fallback.`
      : 'Nettie: Codex unavailable. No executor available.'
  }
  return 'Nettie: Command received. No execution requested. Codex remains the primary executor; fallback executor is none.'
}

// Async Hermes: returns immediately, posts result to chat when done
function askHermesAsync(prompt, pendingMsgId) {
  if (!hermesAvailable) {
    const msg = state.chat.find(m => m.id === pendingMsgId)
    if (msg) {
      msg.text = 'Nettie: Runtime unavailable; command recorded in ledger.'
      msg.kind = 'ack'
      persistState()
    }
    return
  }
  const child = spawn('hermes', ['chat', '-q', prompt, '--quiet'], {
    encoding: 'utf8', cwd: root, env: process.env, shell: false,
  })
  let stdout = '', stderr = ''
  child.stdout.on('data', d => { stdout += d.toString() })
  child.stderr.on('data', d => { stderr += d.toString() })
  child.on('close', (code) => {
    const rawText = stdout.trim()
    const combined = rawText + stderr
    const isOutage = TOKEN_OUTAGE_RE.test(combined) || (code !== 0 && TOKEN_OUTAGE_RE.test(stderr))
    const text = isOutage
      ? `Nettie: Provider outage detected. Command recorded and preserved. Resume when provider restores.`
      : sanitizeNettieVoice(rawText)
    console.log('[LEGACY_HERMES_MANUAL_REPLY]', text.slice(0, 120), isOutage ? '[OUTAGE]' : '')
    const msg = state.chat.find(m => m.id === pendingMsgId)
    if (msg) {
      msg.text = text
      msg.kind = isOutage ? 'outage' : (code === 0 ? 'nettie_async' : 'ack')
      msg.resolvedAt = nowIso()
      if (isOutage) msg.providerOutage = true
      persistState()
    }
    // If outage, mark the associated job and sync recovery ledger
    if (isOutage) {
      const pendingMsg = state.chat.find(m => m.id === pendingMsgId)
      const jobId = pendingMsg?.jobId
      if (jobId) markJobOutage(jobId, { reason: `Provider outage during async execution` })
      else syncRecoveryLedger()
      log('warn', `[OUTAGE] Hermes async outage on msg ${pendingMsgId}: ${stderr.slice(0, 100)}`)
    }
  })
  child.on('error', (err) => {
    const isOutage = TOKEN_OUTAGE_RE.test(err.message)
    console.error('[HERMES_ASYNC_ERR]', err.message)
    const msg = state.chat.find(m => m.id === pendingMsgId)
    if (msg) {
      msg.text = isOutage
        ? `Nettie: Provider outage. Job preserved in recovery ledger.`
        : `Nettie: Runtime error — ${err.message}`
      msg.kind = isOutage ? 'outage' : 'ack'
      persistState()
    }
    if (isOutage) syncRecoveryLedger()
  })
}

async function askSelectedExecutorAsync(prompt, pendingMsgId) {
  const executorStatus = buildExecutorBridgeStatus()
  const selection = resolveNettieConversationExecutor(executorStatus)
  const msg = state.chat.find(m => m.id === pendingMsgId)

  if (selection.executor === 'hermes') {
    if (msg) msg.executorRoute = selection.route
    askHermesAsync(prompt, pendingMsgId)
    return
  }

  if (selection.executor !== 'codex') {
    if (msg) {
      msg.text = executorFailureReply({ type: 'unavailable', message: 'No executor available for live reply.' })
      msg.kind = 'ack'
      msg.resolvedAt = nowIso()
      persistState()
    }
    return
  }

  const result = await runCommandCapture('codex', ['exec', '--cd', root, prompt], {
    cwd: root,
    timeoutMs: CODEX_EXEC_TIMEOUT_MS,
  })
  const output = cleanCodexOutput(result.stdout)
  const classification = classifyExecutorError({
    ...result,
    stdout: output,
    executor: 'Codex executor',
  })

  if (classification.type === 'rate_limited' && hermesAvailable) {
    lastExecutorError = { executor: 'codex', ...classification, at: nowIso() }
    if (msg) msg.executorRoute = 'fallback-cooldown'
    askHermesAsync(prompt, pendingMsgId)
    return
  }

  if (msg) {
    if (classification.type === 'ok') {
      msg.text = sanitizeNettieVoice(output)
      msg.kind = 'nettie_async'
    } else {
      lastExecutorError = { executor: 'codex', ...classification, at: nowIso() }
      msg.text = executorFailureReply(classification, 'codex')
      msg.kind = 'ack'
    }
    msg.resolvedAt = nowIso()
    persistState()
  }
}

function mapTelegramSender(from = {}) {
  const id = String(from.id || '')
  if (id === '6309326772') return 'Patrick'
  if (from.first_name || from.username) return from.first_name || from.username
  return 'Patrick'
}

function extractTelegramMessage(update = {}) {
  const msg = update.message || update.edited_message || null
  if (!msg || typeof msg.text !== 'string') return null
  return {
    text: msg.text,
    chatId: msg.chat?.id,
    threadId: msg.message_thread_id || null,
    sender: mapTelegramSender(msg.from || {}),
  }
}

async function sendTelegramText(chatId, text, threadId = null) {
  if (!telegramApiBase || !chatId || !text) return { skipped: true }
  const payload = {
    chat_id: chatId,
    text: String(text).slice(0, 3900),
  }
  if (threadId) payload.message_thread_id = threadId

  const response = await fetch(`${telegramApiBase}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let data = null
  try { data = await response.json() } catch { data = null }
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.description || `Telegram send failed (${response.status})`)
  }
  return data
}

function assertTelegramSecret(req) {
  if (!telegramWebhookSecret) return true
  const incoming = req.headers['x-telegram-bot-api-secret-token']
  return incoming && incoming === telegramWebhookSecret
}

function handleNettieInbound({ message, sender = 'Patrick', channel = 'mission-control-ui' }) {
  const cleanMessage = String(message || '').trim()
  if (!cleanMessage) {
    return { statusCode: 400, payload: { error: 'message is required' } }
  }

  addChatMessage({
    id: crypto.randomUUID(),
    from: sender,
    role: 'Operator',
    kind: 'command',
    channel,
    text: cleanMessage,
    ts: nowIso(),
  })

  const intent = detectIntent(cleanMessage)
  let replyText
  let replyKind = 'system'
  let createdJob = null
  let pendingId = null

  if (intent === 'job_status') {
    const result = handleJobStatus(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'job_execution') {
    const result = handleJobExecution(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
    createdJob = result.job || null
  } else if (intent === 'job_refinement_directive') {
    const result = handleJobRefinement(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'execution_packet_directive') {
    const result = handleExecutionPacket(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'job_creation_directive') {
    const result = handleAssignment(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
    createdJob = result.job || null
    setImmediate(() => syncRecoveryLedger())
  } else if (intent === 'control_directive') {
    const result = handleControlDirective(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'system_update') {
    const result = handleSystemUpdate(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'execution_command') {
    const result = handleExecutionCommand(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
    createdJob = result.job
    setImmediate(() => syncRecoveryLedger())
  } else if (intent === 'ci_query') {
    const result = handleCIQuery(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'operational_brief') {
    const result = handleOperationalBrief()
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'recovery_query') {
    const result = handleRecoveryQuery(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'executor_status') {
    const result = handleExecutorStatus()
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'global_inspection') {
    const result = handleGlobalInspection(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else if (intent === 'assign_task') {
    const result = handleAssignment(cleanMessage, channel)
    replyText = result.replyText
    replyKind = result.replyKind
    createdJob = result.job
    // sync recovery ledger after new assignment
    setImmediate(() => syncRecoveryLedger())
  } else if (intent === 'dispatch_queue') {
    const result = handleDispatchQueue()
    replyText = result.replyText
    replyKind = result.replyKind
    setImmediate(() => syncRecoveryLedger())
  } else if (intent === 'cleanup_ledger') {
    const result = handleLedgerCleanup()
    replyText = result.replyText
    replyKind = result.replyKind
    setImmediate(() => syncRecoveryLedger())
  } else if (intent === 'control_command') {
    const result = handleControl(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
    setImmediate(() => syncRecoveryLedger())
  } else if (intent === 'status_query') {
    const result = handleStatus(cleanMessage)
    replyText = result.replyText
    replyKind = result.replyKind
  } else {
    pendingId = crypto.randomUUID()
    replyText = 'Nettie: Command received. Processing now.'
    replyKind = 'pending'
    setImmediate(() => {
      askSelectedExecutorAsync(buildNettiePrompt(cleanMessage), pendingId)
        .catch((error) => {
          const msg = state.chat.find((entry) => entry.id === pendingId)
          if (msg) {
            msg.text = `Nettie: Runtime error — ${error.message}`
            msg.kind = 'ack'
            msg.resolvedAt = nowIso()
            persistState()
          }
        })
    })
  }

  const outgoing = {
    id: pendingId ?? crypto.randomUUID(),
    from: 'Nettie',
    role: 'Executive Assistant',
    kind: replyKind,
    channel,
    text: replyText,
    ts: nowIso(),
    jobId: createdJob?.id || null,
    workerId: null,
  }

  addChatMessage(outgoing)
  refreshDerivedState()

  return {
    statusCode: 201,
    payload: {
      reply: outgoing,
      createdJob,
      worker: null,
      intent,
      activeWorkCount: buildMasterWorkRegistry().active.length,
    },
  }
}

const setLastExecutorError = (value) => {
  lastExecutorError = value
}

const routeDeps = {
  fs,
  path,
  os,
  crypto,
  fetch,
  root,
  runtimeDir,
  state,
  jobStore,
  workersDir,
  runningWorkers,
  saveSessionTelemetry,
  saveCooldownTelemetry,
  codexAvailable,
  codexVersion,
  hermesAvailable,
  AI_EXECUTION_PROVIDER,
  AI_EXECUTION_FALLBACK,
  CODEX_CONNECTED_TEXT,
  MC_RUNTIME_NAME,
  HERMES_ALLOWED_SOURCES,
  RUNBOOK_VIOLATION_REASON,
  PRIORITY_DOMAINS,
  instructionRegistry,
  intentAuditLog,
  telegramApiBase,
  telegramWebhookSecret,
  nowIso,
  requireBridgeToken,
  buildExecutorBridgeStatus,
  getExecutorsHealth,
  runCodexSmokeTest,
  summarizeState,
  buildPlatformHealth,
  buildControlPlaneSnapshot,
  getAgentRegistryView,
  getAgentRegistryRecord,
  governanceState: () => governanceState,
  reconcileGovernedRuntimeState,
  evaluateHermesGovernance,
  getRecoveryReconciliationReport,
  buildAndPersistRecoveryReconciliationReport,
  getExecutorForecastView,
  getRestartStateView,
  getObservabilityView,
  getReconciliationQueuesView,
  getArchiveCandidatesView,
  getArchiveCompactionDryRunView,
  getQueueTopologyView,
  getRuntimeCheckpointView,
  persistRuntimeCheckpoint,
  getRuntimeSnapshotExportView,
  createRuntimeSummary,
  listRuntimeSummaries,
  getLatestRuntimeSummary,
  getRuntimeSummaryById,
  getCompactContextView,
  getContextEvictionCandidatesView,
  listReconciliationSnapshots,
  createReconciliationSnapshot,
  attachWorker,
  refreshDerivedState,
  findOpenDuplicateJob,
  saveJob,
  updateJobStatus,
  queryWorkStatus,
  buildMasterWorkRegistry,
  buildActiveWorkView,
  getQueuePrioritiesView,
  getTopNextActionsView,
  getDependencyGraphView,
  getJobDependencyDetail,
  getCooldownBlockedListArtifactView,
  getReconciliationDebtView,
  paginateItems,
  loadRecoveryLedger,
  syncRecoveryLedger,
  updateRecoveryEntry,
  markJobOutage,
  addChatMessage,
  isExplicitHermesRequest,
  selectExecutor,
  queueBridgeMessageForExecutor,
  classifyExecutionIntent,
  shouldRouteChatToExecutor,
  handleNettieInbound,
  sendTelegramText,
  extractTelegramMessage,
  buildHermesContext,
  decomposeTask,
  assignAgentsToSteps,
  createHermesExecutionJob,
  makeHermesResponse,
  makeHermesLogs,
  validateHermesExecutionRequest,
  makeRunbookViolationResult,
  normalizeTaskKey,
  normalizeHermesStatus,
  classifyExecutorError,
  launchSelectedWorker,
  log,
  loadCIRegister,
  ingestIntoCIRegister,
  upsertCIEntry,
  scoreCIEntry,
  saveCIRegister,
  writeCIRegisterMd,
  getIRLSnapshot,
  saveIRLState,
  canonicalDepartmentHeadName,
  extractAgent,
  inferGoverningRunbook,
  validateExecutionPacket,
  validateRequiredArtifacts,
  getDepartmentHeadDir,
  reconcileInstructions,
  setLastExecutorError,
  stateWorkers: () => state.workers,
  jobsLedger,
}

registerRuntimeRoutes(app, routeDeps)
registerAgentsRoutes(app, routeDeps)
registerJobsRoutes(app, routeDeps)
registerChatRoutes(app, routeDeps)
registerOpsRoutes(app, routeDeps)

app.use(express.static(distDir))
app.use((_, res) => {
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    res.sendFile(path.join(distDir, 'index.html'))
  } else {
    res.status(404).send('Mission Control frontend not built yet')
  }
})

const port = Number(process.env.PORT || 4174)
app.listen(port, () => {
  console.log(`Mission Control listening on http://127.0.0.1:${port}`)
  console.log(`Codex available: ${codexAvailable ? `yes (${codexVersion})` : 'no'}`)
  console.log(`Hermes available: ${hermesAvailable ? 'yes' : 'no'}`)
})
