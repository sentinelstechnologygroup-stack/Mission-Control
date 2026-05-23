export const config = {
  api: {
    bodyParser: false,
  },
}

import { proxyToMcApi } from './_proxy.js'

export default async function handler(req, res) {
  await proxyToMcApi(req, res, '/api/runtime')
}
