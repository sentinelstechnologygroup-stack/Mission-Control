export const config = {
  api: {
    bodyParser: false,
  },
}

import * as jobStore from '../../lib/jobStore.js'

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

  const jobs = Array.isArray(jobStore.getAllJobs?.()) ? jobStore.getAllJobs() : []
  sendJson(res, 200, {
    ok: true,
    source: 'local-bypass',
    accessBypassActive: true,
    updatedAt: new Date().toISOString(),
    items: jobs.slice(-20).reverse(),
    jobs: jobs.slice(-20).reverse(),
  })
}
