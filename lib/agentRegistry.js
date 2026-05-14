import fs from 'fs'
import path from 'path'
import { DEPARTMENTS } from './controlPlaneData.js'

const CORE_AGENT_IDS = ['nettie', 'van', 'perry', 'dana', 'torina']
const OPEN_JOB_STATUSES = new Set(['queued', 'running', 'active', 'paused', 'blocked', 'in_progress', 'assigned', 'review'])

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function titleCase(value = '') {
  const text = String(value || '').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

function legacyAgentToRegistry(agent = {}, nowIso = null) {
  const id = String(agent.id || agent.name || '').trim().toLowerCase()
  const displayName = String(agent.name || titleCase(id) || 'Unknown').trim()
  return {
    id,
    displayName,
    department: displayName,
    roleTitle: String(agent.role || 'Registered Agent').trim(),
    domainOwnership: String(agent.focus || 'Unspecified').trim(),
    permissions: ['registered-agent'],
    escalationRules: [
      {
        when: 'Needs formal routing or missing ownership metadata',
        escalateTo: 'Nettie',
        action: 'Review registry classification before execution.',
      },
    ],
    securityGates: {
      perryReviewRequired: false,
      destructiveActionsBlocked: false,
      secretsHandlingRestricted: false,
    },
    status: String(agent.status || 'registered').trim(),
    executorRoute: {
      type: 'unclassified',
      target: 'manual-routing',
      mode: 'unknown',
      available: false,
    },
    fallbackRoute: {
      type: 'escalation',
      target: 'Nettie',
      mode: 'manual',
      available: true,
    },
    heartbeat: {
      tracked: false,
      source: 'registry',
      status: 'unreported',
    },
    lastSeenAt: nowIso,
    activeQueueCount: 0,
    aliases: [displayName],
    seededAt: nowIso,
    updatedAt: nowIso,
  }
}

function departmentToRegistry(department = {}, nowIso = null) {
  const displayName = department.name
  const id = String(department.id || displayName || '').trim().toLowerCase()
  const base = {
    id,
    displayName,
    department: displayName,
    roleTitle: department.title,
    domainOwnership: department.domain,
    permissions: ['read-status', 'receive-routing', 'own-domain'],
    escalationRules: [
      {
        when: 'Task leaves domain ownership or requires principal decision',
        escalateTo: 'Nettie',
        action: 'Return to executive coordination for reroute or approval.',
      },
    ],
    securityGates: {
      perryReviewRequired: false,
      destructiveActionsBlocked: false,
      secretsHandlingRestricted: false,
    },
    status: 'registered',
    executorRoute: {
      type: 'department-head',
      target: displayName,
      mode: 'manual',
      available: false,
    },
    fallbackRoute: {
      type: 'escalation',
      target: 'Nettie',
      mode: 'manual',
      available: true,
    },
    heartbeat: {
      tracked: false,
      source: 'registry',
      status: 'unreported',
    },
    lastSeenAt: null,
    activeQueueCount: 0,
    aliases: [displayName, ...(department.agents || [])],
    seededAt: nowIso,
    updatedAt: nowIso,
  }

  if (id === 'nettie') {
    base.permissions = ['read-status', 'route-work', 'assign-jobs', 'issue-briefings', 'manage-escalations']
    base.executorRoute = { type: 'chat-router', target: 'mission-control', mode: 'live-conversation', available: true }
    base.fallbackRoute = { type: 'executor', target: 'Hermes', mode: 'conditional', available: true }
    base.heartbeat = { tracked: true, source: 'mission-control', status: 'runtime-linked' }
  }

  if (id === 'van') {
    base.permissions = ['read-status', 'own-technical-delivery', 'launch-build-execution', 'manage-local-runtime']
    base.executorRoute = { type: 'executor', target: 'codex', mode: 'primary', available: true }
    base.fallbackRoute = { type: 'executor', target: 'Hermes', mode: 'fallback', available: true }
    base.heartbeat = { tracked: true, source: 'mission-control', status: 'runtime-linked' }
  }

  if (id === 'perry') {
    base.permissions = ['read-status', 'security-review', 'qa-gate', 'approve-destructive-actions', 'approve-secret-handling']
    base.escalationRules = [
      {
        when: 'Destructive actions, prod-impacting changes, or secrets handling are requested',
        escalateTo: 'Perry',
        action: 'Hold execution until Perry gate is satisfied.',
      },
      {
        when: 'Strategic conflict remains after security review',
        escalateTo: 'Nettie',
        action: 'Return for executive resolution.',
      },
    ]
    base.securityGates = {
      perryReviewRequired: true,
      destructiveActionsBlocked: true,
      secretsHandlingRestricted: true,
    }
    base.executorRoute = { type: 'security-gate', target: 'perry-review', mode: 'manual-review', available: false }
    base.fallbackRoute = { type: 'escalation', target: 'Nettie', mode: 'manual', available: true }
  }

  if (id === 'dana') {
    base.permissions = ['read-status', 'financial-analysis', 'roi-review', 'cost-governance']
    base.executorRoute = { type: 'analysis', target: 'dana-review', mode: 'manual-analysis', available: false }
  }

  if (id === 'torina') {
    base.permissions = ['read-status', 'content-packaging', 'editorial-review', 'media-publish-review']
    base.executorRoute = { type: 'content', target: 'torina-review', mode: 'manual-review', available: false }
  }

  return base
}

function hermesRegistryRecord(nowIso = null) {
  return {
    id: 'hermes',
    displayName: 'Hermes',
    department: 'Development Execution',
    roleTitle: 'Deterministic Execution Runtime',
    domainOwnership: 'Structured execution, fallback runs, execution packets, and runtime-backed task completion.',
    permissions: ['execute-structured-work', 'fallback-execution', 'return-structured-results'],
    escalationRules: [
      {
        when: 'Runbook validation fails or source is not allowed',
        escalateTo: 'Nettie',
        action: 'Reject execution and return the failure packet to Mission Control.',
      },
    ],
    securityGates: {
      perryReviewRequired: false,
      destructiveActionsBlocked: false,
      secretsHandlingRestricted: true,
    },
    status: 'registered',
    executorRoute: { type: 'executor', target: 'hermes', mode: 'manual-only', available: true },
    fallbackRoute: { type: 'escalation', target: 'Nettie', mode: 'manual', available: true },
    heartbeat: { tracked: true, source: 'mission-control', status: 'runtime-linked' },
    lastSeenAt: nowIso,
    activeQueueCount: 0,
    aliases: ['Hermes'],
    seededAt: nowIso,
    updatedAt: nowIso,
  }
}

export function buildSeedAgentRegistry({ nowIso = new Date().toISOString(), legacyAgents = [] } = {}) {
  const byId = new Map()
  for (const department of DEPARTMENTS.filter((item) => CORE_AGENT_IDS.includes(item.id))) {
    const record = departmentToRegistry(department, nowIso)
    byId.set(record.id, record)
  }
  byId.set('hermes', hermesRegistryRecord(nowIso))

  for (const legacyAgent of legacyAgents || []) {
    const record = legacyAgentToRegistry(legacyAgent, nowIso)
    if (!record.id || byId.has(record.id)) continue
    byId.set(record.id, record)
  }

  return Array.from(byId.values())
}

function normalizeRegistryRecord(record = {}, nowIso = null) {
  const id = String(record.id || record.displayName || record.name || '').trim().toLowerCase()
  const displayName = String(record.displayName || record.name || titleCase(id) || '').trim()
  return {
    id,
    displayName,
    department: String(record.department || displayName || '').trim(),
    roleTitle: String(record.roleTitle || record.role || 'Registered Agent').trim(),
    domainOwnership: String(record.domainOwnership || record.focus || 'Unspecified').trim(),
    permissions: Array.isArray(record.permissions) ? record.permissions : [],
    escalationRules: Array.isArray(record.escalationRules) ? record.escalationRules : [],
    securityGates: record.securityGates && typeof record.securityGates === 'object' ? record.securityGates : {
      perryReviewRequired: false,
      destructiveActionsBlocked: false,
      secretsHandlingRestricted: false,
    },
    status: String(record.status || 'registered').trim(),
    executorRoute: record.executorRoute && typeof record.executorRoute === 'object' ? record.executorRoute : { type: 'unclassified', target: 'manual-routing', mode: 'unknown', available: false },
    fallbackRoute: record.fallbackRoute && typeof record.fallbackRoute === 'object' ? record.fallbackRoute : { type: 'escalation', target: 'Nettie', mode: 'manual', available: true },
    heartbeat: record.heartbeat && typeof record.heartbeat === 'object' ? record.heartbeat : { tracked: false, source: 'registry', status: 'unreported' },
    lastSeenAt: record.lastSeenAt || null,
    activeQueueCount: Number(record.activeQueueCount || 0),
    aliases: Array.from(new Set([displayName, ...(Array.isArray(record.aliases) ? record.aliases : [])].filter(Boolean))),
    seededAt: record.seededAt || nowIso,
    updatedAt: record.updatedAt || nowIso,
  }
}

export function loadAgentRegistry(filePath, { nowIso = new Date().toISOString(), legacyAgents = [] } = {}) {
  const seeds = buildSeedAgentRegistry({ nowIso, legacyAgents })
  const byId = new Map(seeds.map((record) => [record.id, record]))

  try {
    if (filePath && fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const records = Array.isArray(parsed) ? parsed : parsed?.agents
      if (Array.isArray(records)) {
        for (const record of records) {
          const normalized = normalizeRegistryRecord(record, nowIso)
          if (!normalized.id) continue
          byId.set(normalized.id, { ...byId.get(normalized.id), ...normalized, aliases: Array.from(new Set([...(byId.get(normalized.id)?.aliases || []), ...(normalized.aliases || [])])) })
        }
      }
    }
  } catch {
    // keep seeds
  }

  return Array.from(byId.values())
}

export function writeAgentRegistry(filePath, records = []) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(records, null, 2))
}

function matchesAgent(record, job = {}) {
  const tokens = new Set([
    String(record.displayName || '').toLowerCase(),
    String(record.department || '').toLowerCase(),
    ...((record.aliases || []).map((item) => String(item || '').toLowerCase())),
  ].filter(Boolean))
  const candidates = [job.owner, job.agent, job.department].map((item) => String(item || '').toLowerCase()).filter(Boolean)
  return candidates.some((candidate) => tokens.has(candidate))
}

export function buildAgentRegistryView({
  registry = [],
  jobs = [],
  systemState = {},
  executorStatus = null,
  nowIso = new Date().toISOString(),
  hermesAvailable = false,
  selectedExecutor = 'codex',
  fallbackExecutor = 'hermes',
} = {}) {
  return registry.map((record) => {
    const openJobs = (jobs || []).filter((job) => OPEN_JOB_STATUSES.has(String(job.status || '').toLowerCase()) && matchesAgent(record, job))
    const activeQueueCount = openJobs.length
    const lastSeenAt = record.lastSeenAt || systemState.updatedAt || null
    const next = clone(record)
    next.activeQueueCount = activeQueueCount
    next.lastSeenAt = lastSeenAt
    next.updatedAt = nowIso

    if (record.id === 'nettie') {
      next.status = executorStatus?.bridgeConnected ? 'available' : 'degraded'
      next.executorRoute = { ...record.executorRoute, available: true, target: 'mission-control' }
      next.fallbackRoute = { ...record.fallbackRoute, available: Boolean(executorStatus?.fallback?.available || hermesAvailable) }
      next.heartbeat = { tracked: true, source: 'mission-control', status: executorStatus?.bridgeConnected ? 'live' : 'degraded' }
      return next
    }

    if (record.id === 'van') {
      const status = executorStatus?.executorReady ? 'available' : executorStatus?.executorCoolingDown ? 'cooldown' : (activeQueueCount > 0 ? 'assigned' : 'degraded')
      next.status = status
      next.executorRoute = {
        ...record.executorRoute,
        target: selectedExecutor,
        available: Boolean(executorStatus?.available),
        mode: executorStatus?.executorCoolingDown ? 'cooldown' : 'primary',
      }
      next.fallbackRoute = {
        ...record.fallbackRoute,
        target: fallbackExecutor || 'hermes',
        available: Boolean(executorStatus?.fallback?.available || hermesAvailable),
        mode: executorStatus?.fallback?.mode || 'fallback',
      }
      next.heartbeat = { tracked: true, source: 'runtime', status: status }
      return next
    }

    if (record.id === 'hermes') {
      const hermesStatus = !hermesAvailable ? 'unavailable' : executorStatus?.fallback?.mode === 'manual-only' ? 'manual-only' : (executorStatus?.fallback?.available ? 'available' : 'registered')
      next.status = hermesStatus
      next.executorRoute = {
        ...record.executorRoute,
        target: 'hermes',
        available: Boolean(hermesAvailable),
        mode: executorStatus?.fallback?.mode || 'manual-only',
      }
      next.fallbackRoute = { ...record.fallbackRoute, available: true }
      next.heartbeat = { tracked: true, source: 'runtime', status: hermesAvailable ? 'live' : 'unavailable' }
      return next
    }

    if (record.id === 'perry') {
      next.status = activeQueueCount > 0 ? 'assigned' : 'registered'
      next.heartbeat = { tracked: false, source: 'registry', status: 'security-gate' }
      return next
    }

    next.status = activeQueueCount > 0 ? 'assigned' : 'registered'
    return next
  })
}

export function buildStateAgentSummaries(registry = []) {
  return registry.map((record) => ({
    id: record.id,
    name: record.displayName,
    role: record.roleTitle,
    status: record.status,
    load: record.activeQueueCount,
    focus: record.domainOwnership,
  }))
}

export function findAgentRecord(registry = [], id = '') {
  const needle = String(id || '').trim().toLowerCase()
  return registry.find((record) => record.id === needle) || null
}

export function isAgentAvailabilityQuery(message = '') {
  const text = String(message || '').toLowerCase()
  return /who('?s| is)? available|available agents|agent registry|who owns what|what are they responsible for|responsible for|who handles/.test(text)
}

export function buildAgentAvailabilityBrief(registry = []) {
  const lines = registry.slice(0, 12).map((record) => {
    const queueText = typeof record.activeQueueCount === 'number' ? `${record.activeQueueCount} open` : 'n/a'
    return `• ${record.displayName}: ${record.status} — owns ${record.domainOwnership} | queue ${queueText}`
  })
  return `Nettie: Agent registry availability and ownership\n${lines.join('\n')}`
}
