export const config = {
  api: {
    bodyParser: false,
  },
}

import { proxyToMcApi } from '../../_proxy.js'

export default async function handler(req, res) {
  return proxyToMcApi(req, res, '/api/executor/status')
}
