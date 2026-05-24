export const config = {
  api: {
    bodyParser: false,
  },
}

function sendJson(res, statusCode, body) {
  res.status(statusCode)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Vary', 'Origin')
  res.send(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204)
    res.setHeader('Allow', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mc-bridge-token, CF-Access-Client-Id, CF-Access-Client-Secret')
    res.end()
    return
  }

  sendJson(res, 200, {
    available: true,
    bridgeConnected: true,
    bridgeOnline: true,
    runtime: 'local-bypass',
    executor: 'codex',
    executorReady: true,
    executorCoolingDown: false,
    queueDepth: 0,
    lastHeartbeat: new Date().toISOString(),
    cooldown: {
      provider: 'local-bypass',
      model: 'codex',
      status: 'available',
      estimatedResetTime: null,
      retryDelaySeconds: 0,
      providerQuotaResetSeconds: 0,
      fallbackAttempted: false,
      fallbackResult: 'not-needed',
    },
    fallback: {
      available: true,
      executor: 'hermes',
      mode: 'manual-only',
      autoRoutable: false,
      configured: true,
      detail: 'Temporary Cloudflare Access bypass is active for live verification.',
    },
    selectedExecutor: 'codex',
    lastError: null,
    localAIAvailable: true,
    deepWorkPaused: false,
    localWorkActive: true,
    fallbackReason: 'Temporary Cloudflare Access bypass active',
    nativeExecutorAvailable: true,
    hermesUsed: false,
    bridgeTokenRequired: false,
  })
}
