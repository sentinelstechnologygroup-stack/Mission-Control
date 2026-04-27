const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  const requestUrl = `${API_BASE}${path}`
  const requestOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }

  if (path === '/api/chat') {
    console.log('Sending request to /api/chat', {
      url: requestUrl,
      method: requestOptions.method || 'GET',
      body: requestOptions.body || null,
    })
  }

  let response
  try {
    response = await fetch(requestUrl, requestOptions)
  } catch (e) {
    if (path === '/api/chat') {
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

  if (path === '/api/chat') {
    console.log('Response:', data ?? rawText)
  }

  if (!response.ok) {
    const message = data?.error || data?.message || rawText || `${response.status} ${response.statusText}`
    const error = new Error(message)
    if (path === '/api/chat') {
      console.error('CHAT ERROR:', error)
    }
    throw error
  }

  return data
}

export const api = {
  dashboard: () => request('/api/dashboard'),
  system: () => request('/api/system'),
  jobs: () => request('/api/jobs'),
  agents: () => request('/api/agents'),
  workers: () => request('/api/workers'),
  logs: () => request('/api/logs'),
  chatHistory: () => request('/api/chat/history'),
  createJob: (payload) => request('/api/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  assignJob: (jobId, owner) => request(`/api/jobs/${jobId}/assign`, { method: 'POST', body: JSON.stringify({ owner }) }),
  transitionJob: (jobId, stage) => request(`/api/jobs/${jobId}/transition`, { method: 'POST', body: JSON.stringify({ stage }) }),
  runJob: (jobId, payload) => request(`/api/jobs/${jobId}/run`, { method: 'POST', body: JSON.stringify(payload) }),
  stopWorker: (workerId) => request(`/api/workers/${workerId}/stop`, { method: 'POST' }),
  sendChat: (message) => request('/api/chat', { method: 'POST', body: JSON.stringify({ message, sender: 'Patrick', channel: 'mission-control' }) }),
}
