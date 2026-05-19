const API_BASE =
  import.meta.env.VITE_MC_API_BASE_URL
  || import.meta.env.VITE_API_BASE_URL
  || 'http://127.0.0.1:4174'

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

  return data
}

export const api = {
  homeSummary: () => request('/api/home/summary'),
  triageSummary: () => request('/api/triage/summary'),
  dashboard: () => request('/api/dashboard'),
  system: () => request('/api/system'),
  systemHealth: () => request('/api/system/health'),
  runtimeHealth: () => request('/api/runtime/health'),
  runtimeAlerts: () => request('/api/runtime/alerts'),
  runtimeReconciliation: () => request('/api/runtime/reconciliation'),
  runtimeLocks: () => request('/api/runtime/locks'),
  runtimeSnapshot: () => request('/api/runtime/snapshot/export'),
  queueSummary: () => request('/api/queues/summary'),
  activityRecent: () => request('/api/activity/recent'),
  governanceSummary: () => request('/api/governance/summary'),
  executorStatus: () => request('/api/executor/status'),
  jobs: () => request('/api/jobs'),
  jobsSummary: () => request('/api/jobs/summary'),
  jobsRecent: (limit = 20) => request(`/api/jobs/recent?limit=${limit}`),
  jobsBlocked: () => request('/api/jobs/blocked'),
  jobsStale: () => request('/api/jobs/stale'),
  jobsLedger: () => request('/api/jobs/ledger'),
  workRegistry: () => request('/api/work/registry'),
  workStatus: (project) => request(`/api/work/status?project=${encodeURIComponent(project)}`),
  agents: () => request('/api/agents'),
  departments: () => request('/api/departments'),
  department: (id) => request(`/api/departments/${id}`),
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
  nettieConversationsRecent: () => request('/api/nettie/conversations/recent'),
  createJob: (payload) => request('/api/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  assignJob: (jobId, owner) => request(`/api/jobs/${jobId}/assign`, { method: 'POST', body: JSON.stringify({ owner }) }),
  transitionJob: (jobId, stage) => request(`/api/jobs/${jobId}/transition`, { method: 'POST', body: JSON.stringify({ stage }) }),
  runJob: (jobId, payload) => request(`/api/jobs/${jobId}/run`, { method: 'POST', body: JSON.stringify(payload) }),
  stopWorker: (workerId) => request(`/api/workers/${workerId}/stop`, { method: 'POST' }),
  sendChat: (message) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message, sender: 'Patrick', channel: 'mission-control' }) }),
  sendNettieMessage: (message) => request('/api/nettie/messages', { method: 'POST', body: JSON.stringify({ message, sender: 'Patrick', channel: 'mission-control' }) }),
  nettieCommand: (message, context = {}) => request('/api/nettie/command', { method: 'POST', body: JSON.stringify({ message, operator: 'Patrick', context }) }),
}
