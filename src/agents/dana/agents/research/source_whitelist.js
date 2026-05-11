import { getDanaConfig } from '../../config/index.js'

export function getWhitelistedSources() {
  const cfg = getDanaConfig()
  return cfg.whitelist?.sources || {}
}

export function getAllowedHosts() {
  const cfg = getDanaConfig()
  return new Set(cfg.whitelist?.allowedHosts || [])
}

export function isHostWhitelisted(url) {
  try {
    const host = new URL(url).host
    return getAllowedHosts().has(host)
  } catch {
    return false
  }
}

export function assertWhitelisted(url, label = 'source') {
  if (!isHostWhitelisted(url)) {
    throw new Error(`Dana source blocked by whitelist: ${label} -> ${url}`)
  }
}
