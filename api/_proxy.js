import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

import * as jobStore from '../lib/jobStore.js'
import { buildRuntimeHealth } from '../lib/runtimeHealth.js'
import { buildRuntimeReconciliation } from '../lib/runtimeReconciliation.js'
import { materializeNettieIntent } from '../lib/orchestrationMaterializer.js'

const API_ORIGIN = 'https://mc-api.sentinelstechnologygroup.com'
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
])

const RUNTIME_DIR = path.join(process.cwd(), 'runtime')
const STATE_PATH = path.join(RUNTIME_DIR, 'mission-control-state.json')
const CONVERSATIONS_DIR = path.join(RUNTIME_DIR, 'nettie-conversations')

const LOCAL_BYPASS_ROUTES = new Set([
  '/api/health',
  '/api/system',
  '/api/runtime',
  '/api/runtime/health',
  '/api/runtime/state',
  '/api/runtime/executors',
  '/api/runtime/reconciliation',
  '/api/runtime/snapshot/export',
  '/api/runtime/registry',
  '/api/runtime/events',
  '/api/jobs',
  '/api/jobs/ledger',
  '/api/jobs/recent',
  '/api/jobs/blocked',
  '/api/jobs/stale',
  '/api/packets',
  '/api/chat/history',
  '/api/nettie/messages',
  '/api/nettie/threads',
  '/api/nettie/conversations/recent',
  '/api/nettie/command',
  '/api/executor/status',
  '/api/executors/health',
  '/api/executors/evidence',
  '/api/queues/summary',
  '/api/activity/recent',
])

function readCookie(req, name) {
  const cookieHeader = String(req.headers?.cookie || '')
  if (!cookieHeader) return ''
  const parts = cookieHeader.split(/;\s*/)
  for (const part of parts) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    if (key === name) return decodeURIComponent(part.slice(idx + 1))
  }
  return ''
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function safeJson(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return fallback
  }
}

function getRuntimeStateFile() {
  return safeReadJson(STATE_PATH, {
    system: {
      name: 'Mission Control',
      mode: 'local-bypass',
      selectedExecutor: 'codex',
      fallbackExecutor: 'hermes',
      updatedAt: new Date().toISOString(),
    },
    agents: [],
    jobs: [],
  })
}

function getKnownJobs() {
  try {
    return Array.isArray(jobStore.getAllJobs?.()) ? jobStore.getAllJobs() : []
  } catch {
    return []
  }
}

function getRegistryView() {
  try {
    return jobStore.deriveRegistryView?.({ workerEntries: [] }) || {
      active: [], queued: [], running: [], paused: [], blocked: [], completedRecent: [], sources: [],
    }
  } catch {
    return {
      active: [], queued: [], running: [], paused: [], blocked: [], completedRecent: [], sources: [],
    }
  }
}

function getStatusSummary() {
  try {
    return jobStore.deriveStatusSummary?.({ workerEntries: [] }) || {
      total: 0,
      open: 0,
      closed: 0,
      statuses: {},
      buckets: { active: 0, queued: 0, running: 0, paused: 0, blocked: 0, completedRecent: 0 },
    }
  } catch {
    return {
      total: 0,
      open: 0,
      closed: 0,
      statuses: {},
      buckets: { active: 0, queued: 0, running: 0, paused: 0, blocked: 0, completedRecent: 0 },
    }
  }
}

function getMissionStateJobs() {
  try {
    return Array.isArray(jobStore.deriveMissionStateJobs?.()) ? jobStore.deriveMissionStateJobs() : []
  } catch {
    return []
  }
}

function getWorkflowExecutions() {
  try {
    return Array.isArray(jobStore.deriveWorkflowExecutions?.()) ? jobStore.deriveWorkflowExecutions() : []
  } catch {
    return []
  }
}

function buildQueueSummaryView() {
  const registry = getRegistryView()
  const jobs = getKnownJobs()
  const staleJobs = jobs.filter((job) => /stale|recoverable/i.test(String(job.status || job.routeStatus || '')))
  return {
    sourceType: 'ledger_registry',
    updatedAt: new Date().toISOString(),
    totalQueued: registry.queued.length,
    totalRunning: registry.running.length,
    totalBlocked: registry.blocked.length,
    staleJobs,
    fallbackActive: false,
  }
}

function buildBlockedJobsClassifiedView() {
  const jobs = getKnownJobs()
  const blocked = jobs
    .filter((job) => /blocked|hold|paused/i.test(String(job.status || job.routeStatus || '')))
    .slice(0, 25)
    .map((job) => ({
      id: job.id || job.jobId,
      jobId: job.jobId || job.id,
      title: job.task || job.title || 'Untitled mission',
      owner: job.owner || job.agent || job.department || 'Unassigned',
      status: job.status || job.routeStatus || 'blocked',
      routeStatus: job.routeStatus || job.status || 'blocked',
      updatedAt: job.updatedAt || job.createdAt || new Date().toISOString(),
      blocker: job.lockReason || job.dependencyReason || job.outageReason || null,
    }))
  return { items: blocked, count: blocked.length, updatedAt: new Date().toISOString(), sourceType: 'ledger_registry' }
}

function buildReportsStatusView() {
  return { updatedAt: new Date().toISOString(), sourceType: 'runtime_reports', staleCount: 0, reports: [] }
}

function buildExecutorStatusView() {
  const state = getRuntimeStateFile()
  const selectedExecutor = state.system?.selectedExecutor || 'codex'
  return {
    available: true,
    bridgeConnected: true,
    bridgeOnline: true,
    runtime: state.system?.mode || 'local-bypass',
    executor: selectedExecutor,
    executorReady: true,
    executorCoolingDown: false,
    queueDepth: getKnownJobs().length,
    lastHeartbeat: state.system?.updatedAt || new Date().toISOString(),
    cooldown: {
      provider: 'local-bypass',
      model: selectedExecutor,
      status: 'available',
      estimatedResetTime: null,
      retryDelaySeconds: 0,
      providerQuotaResetSeconds: 0,
      fallbackAttempted: false,
      fallbackResult: 'not-needed',
    },
    fallback: {
      available: true,
      executor: state.system?.fallbackExecutor || 'hermes',
      mode: 'manual-only',
      autoRoutable: false,
      configured: true,
      detail: 'Temporary Cloudflare Access bypass is active for live verification.',
    },
    selectedExecutor,
    lastError: null,
    localAIAvailable: true,
    deepWorkPaused: false,
    localWorkActive: true,
    fallbackReason: 'Temporary Cloudflare Access bypass active',
    nativeExecutorAvailable: true,
    hermesUsed: false,
    bridgeTokenRequired: false,
  }
}

function buildRuntimeHealthView() {
  const queueSummary = buildQueueSummaryView()
  const reportsStatus = buildReportsStatusView()
  const executorStatus = buildExecutorStatusView()
  const registry = getRegistryView()
  const reconciliation = buildRuntimeReconciliation({
    ledgerJobs: getKnownJobs(),
    registry,
    activeWorkView: { count: registry.active.length },
    queueSummary,
    blockedJobs: buildBlockedJobsClassifiedView().items,
    recentActivity: [],
    reportStatus: reportsStatus,
    snapshot: {},
    executorState: executorStatus,
  })
  return buildRuntimeHealth({
    platformHealth: { backend: 'healthy', access: 'bypassed' },
    queueSummary,
    reportsStatus,
    executorStatus,
    reconciliation,
  })
}

function buildRuntimeSnapshot() {
  const state = getRuntimeStateFile()
  const health = buildRuntimeHealthView()
  const executorStatus = buildExecutorStatusView()
  const registry = getRegistryView()
  const summary = getStatusSummary()
  return {
    updatedAt: new Date().toISOString(),
    system: state.system || {},
    agents: Array.isArray(state.agents) ? state.agents : [],
    jobs: getMissionStateJobs(),
    runtime: {
      health,
      executorStatus,
      registry,
      summary,
      accessBypassActive: true,
    },
    nettie: {
      status: 'ONLINE',
      detail: 'chat, history, and packet creation available',
      fallbackReason: 'Temporary Cloudflare Access bypass active',
      selectedExecutor: executorStatus.selectedExecutor,
      nativeExecutorAvailable: true,
      hermesUsed: false,
    },
  }
}

function buildRecentConversations(limit = 20) {
  try {
    if (!fs.existsSync(CONVERSATIONS_DIR)) return []
    const files = fs.readdirSync(CONVERSATIONS_DIR)
      .filter((file) => file.endsWith('.json'))
      .map((file) => ({
        file,
        path: path.join(CONVERSATIONS_DIR, file),
        stat: fs.statSync(path.join(CONVERSATIONS_DIR, file)),
      }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
      .slice(0, Math.max(1, Math.min(Number(limit) || 20, 100)))

    return files.map(({ path: filePath }) => {
      const convo = safeReadJson(filePath, null) || {}
      return {
        id: convo.id || path.basename(filePath, '.json'),
        createdAt: convo.createdAt || null,
        updatedAt: convo.updatedAt || convo.createdAt || null,
        truthStatus: convo.truthStatus || 'LIVE',
        intent: convo.intent || null,
        summary: convo.summary || convo.statusSummary || '',
        replyMarkdown: convo.replyMarkdown || convo.assistantReply || '',
        assistantReply: convo.assistantReply || convo.replyMarkdown || '',
        conversationMode: convo.conversationMode || 'assistant-first',
        routingDecision: convo.routingDecision || convo.intent || null,
        threadId: convo.threadId || null,
        messages: Array.isArray(convo.messages) ? convo.messages : [],
        queriedSources: Array.isArray(convo.queriedSources) ? convo.queriedSources : [],
        recommendedActions: Array.isArray(convo.recommendedActions) ? convo.recommendedActions : [],
        createdJobs: Array.isArray(convo.createdJobs) ? convo.createdJobs : [],
        executionMode: convo.executionMode || 'MC_NATIVE',
        packetId: convo.packetId || convo.jobId || null,
        workflowLink: convo.workflowLink || null,
        departmentLink: convo.departmentLink || null,
        statusSummary: convo.statusSummary || convo.summary || '',
        suggestedNextSteps: Array.isArray(convo.suggestedNextSteps) ? convo.suggestedNextSteps : [],
        requiresApproval: Boolean(convo.requiresApproval),
        approvalReason: convo.approvalReason || null,
        confidence: convo.confidence || null,
        operator: convo.operator || 'Patrick',
        context: convo.context || null,
        command: convo.command || convo.message || '',
        executionId: convo.executionId || null,
        eventId: convo.eventId || null,
        department: convo.department || null,
        status: convo.status || null,
        lifecycleState: convo.lifecycleState || null,
        assignedDepartmentHead: convo.assignedDepartmentHead || null,
        assignedAgent: convo.assignedAgent || null,
        hermesUsed: Boolean(convo.hermesUsed),
        fallbackReason: convo.fallbackReason || null,
        nativeExecutorAvailable: convo.nativeExecutorAvailable ?? null,
        selectedExecutor: convo.selectedExecutor || null,
        jobId: convo.jobId || convo.packetId || null,
        packetLink: convo.packetLink || null,
        workflowRecordLink: convo.workflowRecordLink || null,
        approvalRequired: Boolean(convo.approvalRequired),
        departmentSlug: convo.departmentSlug || null,
      }
    })
  } catch {
    return []
  }
}

function buildChatHistory() {
  const recent = buildRecentConversations(1)[0]
  if (recent?.messages?.length) return recent.messages
  const jobs = getKnownJobs()
  return jobs.slice(-5).map((job) => ({
    role: 'system',
    from: 'Nettie',
    text: job.task || job.title || 'Untitled mission',
    ts: job.updatedAt || job.createdAt || new Date().toISOString(),
    jobId: job.id || job.jobId || null,
  }))
}

function buildPackets() {
  const executions = getWorkflowExecutions()
  return executions.slice(0, 50).map((execution) => ({
    packetId: execution.jobId || execution.executionId,
    executionId: execution.executionId,
    jobId: execution.jobId || null,
    title: execution.title || 'Untitled execution',
    owner: execution.owner || 'Unassigned',
    department: execution.department || 'Unassigned',
    status: execution.status || 'queued',
    routeStatus: execution.routeStatus || execution.status || 'queued',
    currentStep: execution.currentStep || 'intake',
    logs: Array.isArray(execution.logs) ? execution.logs : [],
    evidence: execution.evidence || null,
    blockers: Array.isArray(execution.blockers) ? execution.blockers : [],
    updatedAt: execution.updatedAt || execution.createdAt || null,
    workflowLink: `/departments/${String(execution.department || 'technology').toLowerCase()}/agents/${String(execution.owner || 'van').toLowerCase()}`,
  }))
}

function buildSystemView() {
  const state = getRuntimeStateFile()
  const executorStatus = buildExecutorStatusView()
  return {
    ...state.system,
    selectedExecutor: executorStatus.selectedExecutor,
    fallbackExecutor: executorStatus.fallback.executor,
    hermesAvailable: true,
    codexAvailable: true,
    accessBypassActive: true,
    updatedAt: new Date().toISOString(),
  }
}

function json(res, status, payload, req = null) {
  if (req) {
    const origin = req.headers?.origin || '*'
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.status(status).json(safeJson(payload, payload))
}

function addBridgeHeaders(req, targetHeaders) {
  const accessClientId = process.env.CF_ACCESS_CLIENT_ID || process.env.CF_ACCESS_CLIENT_ID_VALUE || readCookie(req, 'mc_cf_access_client_id') || ''
  const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET || process.env.CF_ACCESS_CLIENT_SECRET_VALUE || readCookie(req, 'mc_cf_access_client_secret') || ''
  const bridgeToken = process.env.MC_BRIDGE_TOKEN || process.env.VITE_MC_BRIDGE_TOKEN || readCookie(req, 'mc_bridge_token') || ''

  if (accessClientId && accessClientSecret) {
    targetHeaders.set('CF-Access-Client-Id', accessClientId)
    targetHeaders.set('CF-Access-Client-Secret', accessClientSecret)
  }

  if (bridgeToken) {
    targetHeaders.set('Authorization', `Bearer ${bridgeToken}`)
    targetHeaders.set('x-mc-bridge-token', bridgeToken)
  }
}

function copyIncomingHeaders(req) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value == null) continue
    const normalized = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(normalized) || normalized === 'host') continue
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '))
    } else {
      headers.set(key, String(value))
    }
  }
  addBridgeHeaders(req, headers)
  return headers
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve(undefined)
      return
    }

    const chunks = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => {
      if (!chunks.length) {
        resolve(undefined)
        return
      }
      resolve(Buffer.concat(chunks))
    })
    req.on('error', reject)
  })
}

export function sendCors(req, res) {
  const origin = req.headers.origin || '*'
  res.status(204).setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mc-bridge-token, CF-Access-Client-Id, CF-Access-Client-Secret')
  res.setHeader('Access-Control-Max-Age', '86400')
  res.end()
}

async function handleLocalBypass(req, res, pathname) {
  const incomingUrl = new URL(req.url || '/api', 'http://127.0.0.1')
  const limit = Math.max(1, Math.min(Number(incomingUrl.searchParams.get('limit') || 20), 100))

  switch (pathname) {
    case '/api/health':
      return json(res, 200, {
        ok: true,
        status: 'ok',
        source: 'local-bypass',
        accessBypassActive: true,
        updatedAt: new Date().toISOString(),
        system: buildSystemView(),
        runtime: buildRuntimeHealthView(),
      }, req)

    case '/api/system':
      return json(res, 200, {
        ok: true,
        source: 'local-bypass',
        accessBypassActive: true,
        updatedAt: new Date().toISOString(),
        system: buildSystemView(),
        agents: getRuntimeStateFile().agents || [],
        jobs: getMissionStateJobs(),
      }, req)

    case '/api/runtime':
    case '/api/runtime/health':
      return json(res, 200, {
        ok: true,
        source: 'local-bypass',
        accessBypassActive: true,
        updatedAt: new Date().toISOString(),
        health: buildRuntimeHealthView(),
        executorStatus: buildExecutorStatusView(),
        registry: getRegistryView(),
        summary: getStatusSummary(),
      }, req)

    case '/api/runtime/state': {
      const runtimeState = buildRuntimeSnapshot()
      return json(res, 200, runtimeState, req)
    }

    case '/api/runtime/executors':
    case '/api/executor/status':
    case '/api/executors/health':
      return json(res, 200, buildExecutorStatusView(), req)

    case '/api/executors/evidence':
      return json(res, 200, {
        updatedAt: new Date().toISOString(),
        accessBypassActive: true,
        items: [],
        selectedExecutor: buildExecutorStatusView().selectedExecutor,
      }, req)

    case '/api/runtime/reconciliation': {
      const queueSummary = buildQueueSummaryView()
      const reportsStatus = buildReportsStatusView()
      const executorStatus = buildExecutorStatusView()
      return json(res, 200, buildRuntimeReconciliation({
        ledgerJobs: getKnownJobs(),
        registry: getRegistryView(),
        activeWorkView: { count: getRegistryView().active.length },
        queueSummary,
        blockedJobs: buildBlockedJobsClassifiedView().items,
        recentActivity: [],
        reportStatus: reportsStatus,
        snapshot: {},
        executorState: executorStatus,
      }), req)
    }

    case '/api/runtime/snapshot/export':
      return json(res, 200, buildRuntimeSnapshot(), req)

    case '/api/runtime/registry':
      return json(res, 200, getRegistryView(), req)

    case '/api/runtime/events':
      return json(res, 200, { updatedAt: new Date().toISOString(), items: [] }, req)

    case '/api/queues/summary':
      return json(res, 200, buildQueueSummaryView(), req)

    case '/api/activity/recent':
      return json(res, 200, {
        updatedAt: new Date().toISOString(),
        items: getMissionStateJobs().slice(0, 20),
      }, req)

    case '/api/jobs':
    case '/api/jobs/ledger':
      return json(res, 200, {
        ok: true,
        items: getKnownJobs(),
        jobs: getKnownJobs(),
        count: getKnownJobs().length,
      }, req)

    case '/api/jobs/recent':
      return json(res, 200, {
        ok: true,
        items: getKnownJobs().slice(-limit).reverse(),
        jobs: getKnownJobs().slice(-limit).reverse(),
      }, req)

    case '/api/jobs/blocked':
      return json(res, 200, buildBlockedJobsClassifiedView(), req)

    case '/api/jobs/stale':
      return json(res, 200, { updatedAt: new Date().toISOString(), items: [] }, req)

    case '/api/packets':
      return json(res, 200, buildPackets(), req)

    case '/api/chat/history':
      return json(res, 200, buildChatHistory(), req)

    case '/api/nettie/messages':
      return json(res, 200, { messages: buildChatHistory() }, req)

    case '/api/nettie/threads':
      return json(res, 200, {
        threads: buildRecentConversations(limit).map((conversation) => ({
          id: conversation.id,
          threadId: conversation.threadId || conversation.id,
          title: conversation.summary || conversation.command || 'Nettie conversation',
          updatedAt: conversation.updatedAt || conversation.createdAt || null,
        })),
      }, req)

    case '/api/nettie/conversations/recent':
      return json(res, 200, buildRecentConversations(limit), req)

    case '/api/nettie/command': {
      let body = ''
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const raw = await collectBody(req)
        body = raw ? raw.toString('utf8') : ''
      }
      let payload = {}
      try {
        payload = body ? JSON.parse(body) : {}
      } catch {
        payload = { message: body }
      }
      const message = String(payload.message || payload.command || payload.text || '').trim() || 'who are you?'
      const result = await materializeNettieIntent({
        message,
        threadId: payload.threadId || payload.context?.threadId || null,
        actor: payload.actor || 'Patrick',
        selectedMode: payload.selectedMode || 'MC_NATIVE',
        context: {
          ...(payload.context || {}),
          route: payload.route || '/nettie',
          surface: payload.surface || 'command-center',
          accessBypassActive: true,
        },
        deps: {
          jobStore,
          buildQueueSummaryView,
          buildBlockedJobsClassifiedView,
          buildReportsStatusView,
          buildRuntimeHealthView,
          buildRuntimeReconciliationView: () => buildRuntimeReconciliation({
            ledgerJobs: getKnownJobs(),
            registry: getRegistryView(),
            activeWorkView: { count: getRegistryView().active.length },
            queueSummary: buildQueueSummaryView(),
            blockedJobs: buildBlockedJobsClassifiedView().items,
            recentActivity: [],
            reportStatus: buildReportsStatusView(),
            snapshot: {},
            executorState: buildExecutorStatusView(),
          }),
          buildRuntimeLocksView: async () => ({ updatedAt: new Date().toISOString(), lockConflicts: [], staleLocks: [] }),
          buildTriageSummaryView: async () => ({ updatedAt: new Date().toISOString(), status: 'LIVE', items: [] }),
          buildMasterWorkRegistry: () => getRegistryView(),
          addChatMessage: () => {},
        },
      })
      return json(res, 200, result, req)
    }

    default:
      return null
  }
}

export async function proxyToMcApi(req, res, pathOverride = null) {
  if (req.method === 'OPTIONS') {
    sendCors(req, res)
    return
  }

  const incomingUrl = new URL(req.url || '/api', 'http://127.0.0.1')
  const pathname = pathOverride || (incomingUrl.pathname.startsWith('/api') ? incomingUrl.pathname : `/api${incomingUrl.pathname}`)

  if (LOCAL_BYPASS_ROUTES.has(pathname) || pathname.startsWith('/api/runtime/') || pathname.startsWith('/api/jobs/')) {
    const handled = await handleLocalBypass(req, res, pathname)
    if (handled !== null) return
  }

  const targetUrl = new URL(pathname, API_ORIGIN)
  targetUrl.search = incomingUrl.search

  try {
    const body = await collectBody(req)
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: copyIncomingHeaders(req),
      body,
      redirect: 'manual',
    })

    res.status(upstream.status)
    upstream.headers.forEach((value, key) => {
      const normalized = key.toLowerCase()
      if (HOP_BY_HOP_HEADERS.has(normalized)) return
      res.setHeader(key, value)
    })
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
    res.setHeader('Vary', 'Origin')

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.send(buffer)
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: 'proxy_error',
      message: error?.message || 'Failed to proxy Mission Control API request',
      path: pathname,
    })
  }
}
