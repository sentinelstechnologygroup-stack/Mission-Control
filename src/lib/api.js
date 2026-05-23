const API_BASE_OVERRIDE =
  import.meta.env.VITE_MC_API_BASE_URL
  || import.meta.env.VITE_API_BASE_URL
  || ''

const API_BASE = typeof window === 'undefined'
  ? (API_BASE_OVERRIDE || 'http://127.0.0.1:4174')
  : ''

const BRIDGE_TOKEN = import.meta.env.VITE_MC_BRIDGE_TOKEN || ''
const AUTHENTICATED_PATHS = new Set([
  '/api/executor/status',
  '/api/nettie/messages',
])

function buildHeaders(path, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  if (AUTHENTICATED_PATHS.has(path) && BRIDGE_TOKEN) {
    headers.Authorization = `Bearer ${BRIDGE_TOKEN}`
  }

  return headers
}

async function request(path, options = {}) {
  const requestUrl = `${API_BASE}${path}`
  const requestOptions = {
    headers: buildHeaders(path, options.headers || {}),
    ...options,
  }

  if (path === '/api/nettie/messages' || path === '/api/chat' || path === '/api/nettie/command') {
    console.log(`Sending request to ${path}`, {
      url: requestUrl,
      method: requestOptions.method || 'GET',
      body: requestOptions.body || null,
      authenticated: Boolean(requestOptions.headers.Authorization),
    })
  }

  let response
  try {
    response = await fetch(requestUrl, requestOptions)
  } catch (e) {
    if (path === '/api/nettie/messages' || path === '/api/chat' || path === '/api/nettie/command') {
      console.error('CHAT ERROR:', e)
    }
    throw e
  }

  const rawText = await response.text()
  let data = null
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = null
  }

  if (path === '/api/nettie/messages' || path === '/api/chat' || path === '/api/nettie/command') {
    console.log('Response:', data ?? rawText)
  }

  if (!response.ok) {
    const message = data?.error || data?.reason || data?.message || rawText || `${response.status} ${response.statusText}`
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    if (path === '/api/nettie/messages' || path === '/api/chat' || path === '/api/nettie/command') {
      console.error('CHAT ERROR:', error)
    }
    throw error
  }

  notifyCostTelemetryRefresh(path, requestOptions)

  return data
}

function notifyCostTelemetryRefresh(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  if (method === 'GET') return

  const refreshPaths = [
    '/api/chat',
    '/api/nettie/messages',
    '/api/nettie/command',
    '/api/jobs',
    '/api/jobs/',
    '/api/workers/',
    '/api/costs/session',
    '/api/costs/cooldowns',
  ]

  if (!refreshPaths.some((prefix) => path === prefix || path.startsWith(prefix))) return
  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent('mission-control:costs-updated', { detail: { path, method, at: new Date().toISOString() } }))
}

export const api = {
  homeSummary: () => request('/api/home/summary'),
  triageSummary: () => request('/api/triage/summary'),
  dashboard: () => request('/api/dashboard'),
  system: () => request('/api/system'),
  systemHealth: () => request('/api/system/health'),
  runtimeHealth: () => request('/api/runtime/health'),
  runtimeExecutors: async () => {
    const data = await request('/api/runtime/executors')
    if (data && typeof data === 'object' && !Array.isArray(data)) return data
    const [health, activity] = await Promise.all([
      request('/api/runtime/health'),
      request('/api/activity/recent'),
    ])
    return {
      bridge: {
        available: Boolean(health?.executorTruth || health?.selectedExecutor),
        selectedExecutor: health?.selectedExecutor || 'codex',
        fallbackExecutor: health?.fallbackExecutor || 'hermes',
      },
      routingPolicy: {
        truthStatus: health?.executorTruth || health?.overallHealth || 'UNKNOWN',
        selectedExecutor: health?.selectedExecutor || 'codex',
      },
      localHealth: {
        overallHealth: health?.overallHealth || 'UNKNOWN',
        executorTruth: health?.executorTruth || 'UNKNOWN',
      },
      recentActivity: Array.isArray(activity) ? activity.slice(0, 10) : [],
    }
  },
  runtimeAlerts: () => request('/api/runtime/alerts'),
  runtimeReconciliation: () => request('/api/runtime/reconciliation'),
  runtimeLocks: () => request('/api/runtime/locks'),
  runtimeSnapshot: () => request('/api/runtime/snapshot/export'),
  runtimeState: () => request('/api/runtime/state'),
  runtimeEvents: () => request('/api/runtime/events'),
  runtimeRegistry: () => request('/api/runtime/registry'),
  queueSummary: () => request('/api/queues/summary'),
  activityRecent: () => request('/api/activity/recent'),
  governanceSummary: () => request('/api/governance/summary'),
  governanceRecursive: () => request('/api/governance/recursive'),
  executorStatus: () => request('/api/executor/status'),
  executorsHealth: () => request('/api/executors/health'),
  executorEvidence: () => request('/api/executors/evidence'),
  missionRuntimeState: () => request('/api/mission-runtime/state'),
  missionRuntimeJobs: () => request('/api/mission-runtime/jobs'),
  missionRuntimeCreateJob: (payload) => request('/api/mission-runtime/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  missionRuntimeJob: (jobId) => request(`/api/mission-runtime/jobs/${jobId}`),
  missionRuntimeWorkflow: (jobId) => request(`/api/mission-runtime/jobs/${jobId}/workflow`),
  missionRuntimeNodes: (jobId) => request(`/api/mission-runtime/jobs/${jobId}/nodes`),
  missionRuntimeEdges: (jobId) => request(`/api/mission-runtime/jobs/${jobId}/edges`),
  missionRuntimeEvidence: (jobId) => request(`/api/mission-runtime/jobs/${jobId}/evidence`),
  missionRuntimeMessages: (jobId) => request(`/api/mission-runtime/jobs/${jobId}/messages`),
  missionRuntimeModelRuns: (jobId) => request(`/api/mission-runtime/jobs/${jobId}/model-runs`),
  auroraState: () => request('/api/aurora/state'),
  auroraJobs: () => request('/api/aurora/jobs'),
  auroraCreateJob: (payload) => request('/api/aurora/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  auroraJob: (jobId) => request(`/api/aurora/jobs/${jobId}`),
  auroraWorkflow: (jobId) => request(`/api/aurora/jobs/${jobId}/workflow`),
  auroraNodes: (jobId) => request(`/api/aurora/jobs/${jobId}/nodes`),
  auroraEdges: (jobId) => request(`/api/aurora/jobs/${jobId}/edges`),
  auroraEvidence: (jobId) => request(`/api/aurora/jobs/${jobId}/evidence`),
  auroraMessages: (jobId) => request(`/api/aurora/jobs/${jobId}/messages`),
  auroraModelRuns: (jobId) => request(`/api/aurora/jobs/${jobId}/model-runs`),
  jobs: () => request('/api/jobs'),
  jobsSummary: () => request('/api/jobs/summary'),
  jobsRecent: async (limit = 20) => {
    const data = await request(`/api/jobs/recent?limit=${limit}`)
    return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.jobs) ? data.jobs : []
  },
  jobsBlocked: () => request('/api/jobs/blocked'),
  jobsStale: () => request('/api/jobs/stale'),
  jobsLedger: async () => {
    const data = await request('/api/jobs/ledger')
    return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : Array.isArray(data?.jobs) ? data.jobs : []
  },
  workflowExecutions: async (limit = 50) => {
    const data = await request(`/api/workflows/executions?limit=${limit}`)
    if (Array.isArray(data)) return data
    const ledger = await request('/api/jobs/ledger')
    const jobs = Array.isArray(ledger) ? ledger : Array.isArray(ledger?.items) ? ledger.items : []
    return jobs
      .map((job) => job.workflowExecution || null)
      .filter(Boolean)
      .slice(0, limit)
  },
  workflowExecution: async (executionId) => {
    const data = await request(`/api/workflows/executions/${executionId}`)
    if (data && typeof data === 'object' && !Array.isArray(data)) return data
    const ledger = await request('/api/jobs/ledger')
    const jobs = Array.isArray(ledger) ? ledger : Array.isArray(ledger?.items) ? ledger.items : []
    return jobs.map((job) => job.workflowExecution || null).find((execution) => execution?.executionId === executionId || execution?.jobId === executionId) || null
  },
  workRegistry: () => request('/api/work/registry'),
  workStatus: (project) => request(`/api/work/status?project=${encodeURIComponent(project)}`),
  agents: () => request('/api/agents'),
  departments: () => request('/api/departments'),
  department: (id) => request(`/api/departments/${id}`),
  departmentsWorkflows: () => request('/api/departments/workflows'),
  projects: () => request('/api/projects'),
  reports: () => request('/api/reports'),
  reportsStatus: () => request('/api/reports/status'),
  reportsRecent: () => request('/api/reports/recent'),
  reportsStale: () => request('/api/reports/stale'),
  costs: () => request('/api/costs'),
  qa: () => request('/api/qa'),
  securityReview: () => request('/api/security/review'),
  decisions: () => request('/api/decisions'),
  integrations: () => request('/api/integrations'),
  workers: () => request('/api/workers'),
  logs: () => request('/api/logs'),
  chatHistory: () => request('/api/chat/history'),
  nettieThreads: async () => {
    const data = await request('/api/nettie/threads')
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.threads)) return data.threads
    return []
  },
  nettieMessages: async () => {
    const data = await request('/api/nettie/messages')
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.messages)) return data.messages
    return []
  },
  nettieConversationsRecent: async () => {
    const data = await request('/api/nettie/conversations/recent')
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.conversations)) return data.conversations
    return []
  },
  packets: async () => {
    const data = await request('/api/packets')
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    return []
  },
  createJob: (payload) => request('/api/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  assignJob: (jobId, owner) => request(`/api/jobs/${jobId}/assign`, { method: 'POST', body: JSON.stringify({ owner }) }),
  transitionJob: (jobId, stage) => request(`/api/jobs/${jobId}/transition`, { method: 'POST', body: JSON.stringify({ stage }) }),
  runJob: (jobId, payload) => request(`/api/jobs/${jobId}/run`, { method: 'POST', body: JSON.stringify(payload) }),
  stopWorker: (workerId) => request(`/api/workers/${workerId}/stop`, { method: 'POST' }),
  sendChat: (message) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message, sender: 'Patrick', channel: 'mission-control' }) }),
  sendNettieMessage: (message) => request('/api/nettie/messages', { method: 'POST', body: JSON.stringify({ message, sender: 'Patrick', channel: 'mission-control' }) }),
  nettieCommand: (message, context = {}) => request('/api/nettie/command', { method: 'POST', body: JSON.stringify({ message, operator: 'Patrick', context }) }),
}
