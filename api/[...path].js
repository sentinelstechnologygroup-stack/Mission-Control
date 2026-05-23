export const config = {
  api: {
    bodyParser: false,
  },
}

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

function appendProxyHeaders(req, targetHeaders) {
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
  appendProxyHeaders(req, headers)
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin || '*'
    res.status(204).setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mc-bridge-token, CF-Access-Client-Id, CF-Access-Client-Secret')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.end()
    return
  }

  const incomingUrl = new URL(req.url || '/api', 'http://127.0.0.1')
  const pathname = incomingUrl.pathname.startsWith('/api') ? incomingUrl.pathname : `/api${incomingUrl.pathname}`
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
