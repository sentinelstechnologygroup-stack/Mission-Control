import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { loadTelemetry } from './tokenTelemetry.js'

export const DEPARTMENTS = [
  {
    id: 'nettie',
    name: 'Nettie',
    title: 'Executive Assistant / Chief of Staff / Command Coordinator',
    domain: 'Executive coordination, routing, escalation, readiness, and response gating',
    mandate: 'Interpret Patrick’s intent, route it to the right owner, track execution, and present clean operational status.',
    agents: ['Nettie'],
    routeKeywords: ['nettie', 'executive', 'routing', 'coordination', 'approval', 'briefing'],
  },
  {
    id: 'van',
    name: 'Van',
    title: 'Chief Technology & Operations Officer',
    domain: 'Technology, frontend, backend, infrastructure, deployment, QA execution, local runtime',
    mandate: 'Own technical delivery, local project health, build validation, and production readiness.',
    agents: ['Forge', 'Blueprint', 'Warden', 'Prism', 'Pulse', 'Sessions', 'SignalDoc'],
    routeKeywords: ['van', 'forge', 'blueprint', 'warden', 'prism', 'pulse', 'sessions', 'signaldoc', 'build', 'frontend', 'backend', 'api', 'deploy', 'git', 'repo', 'base44'],
  },
  {
    id: 'perry',
    name: 'Perry',
    title: 'Chief Security Officer',
    domain: 'Security, permissions, destructive actions, secrets, credentials, production risk',
    mandate: 'Block unsafe changes, validate risk posture, and enforce security QA gates.',
    agents: ['Lock', 'Vault', 'Sentry', 'Calamity'],
    routeKeywords: ['perry', 'lock', 'vault', 'sentry', 'calamity', 'security', 'secret', 'credential', 'permission', 'destructive'],
  },
  {
    id: 'torina',
    name: 'Torina',
    title: 'Chief Media Officer',
    domain: 'Content, blogs, copy, publishing, media packaging, editorial review',
    mandate: 'Ship media and editorial work that is source-backed, brand-consistent, and publication-ready.',
    agents: ['Quill', 'Scribe', 'Frame', 'Signal', 'Polish'],
    routeKeywords: ['torina', 'quill', 'scribe', 'frame', 'polish', 'blog', 'article', 'copy', 'seo', 'media', 'thumbnail'],
  },
  {
    id: 'dana',
    name: 'Dana',
    title: 'Chief Financial Officer',
    domain: 'Finance, AI cost tracking, reports, investment intelligence, ROI, budgeting',
    mandate: 'Maintain financial visibility, investment reporting, cost awareness, and decision-useful analysis.',
    agents: ['Ledger', 'Anvil', 'Reserve', 'Portfolio'],
    routeKeywords: ['dana', 'ledger', 'anvil', 'reserve', 'portfolio', 'budget', 'finance', 'report', 'roi', 'investment', 'cost'],
  },
  {
    id: 'icky',
    name: 'Icky',
    title: 'Chief Administrative Officer',
    domain: 'Administration, scheduling, SOPs, documents, records, follow-through',
    mandate: 'Keep administrative workflows orderly, documented, and actionable.',
    agents: ['Clerk', 'Anchor', 'Orderly', 'Table', 'Case', 'Bea'],
    routeKeywords: ['icky', 'clerk', 'anchor', 'orderly', 'table', 'case', 'bea', 'admin', 'sop', 'document', 'schedule', 'email'],
  },
  {
    id: 'funboy',
    name: 'Funboy',
    title: 'Chief Opportunity Intelligence Officer',
    domain: 'Opportunity scans, prospecting, competitor pain, market signals, scoring',
    mandate: 'Surface high-value opportunities and convert research into ranked action.',
    agents: ['Drift', 'Signal', 'Heatmap', 'Scout', 'Rank', 'Rollup', 'SIS'],
    routeKeywords: ['funboy', 'ivy', 'drift', 'heatmap', 'scout', 'rank', 'rollup', 'sis', 'competitor', 'opportunity', 'prospect', 'market'],
  },
  {
    id: 'rab',
    name: 'Rab',
    title: 'Chief Research & Development Officer',
    domain: 'R&D, prototypes, experiments, future products, technical feasibility',
    mandate: 'Validate future-facing product and system ideas before handoff into full build.',
    agents: ['Lab', 'Model', 'Pilot', 'Vector'],
    routeKeywords: ['rab', 'lab', 'model', 'pilot', 'vector', 'prototype', 'experiment', 'r&d', 'research', 'feasibility'],
  },
]

const PROJECT_TYPE_HINTS = [
  ['website', 'Website'],
  ['landing', 'Website'],
  ['middleware', 'Tool'],
  ['saas', 'SaaS'],
  ['client', 'Client'],
  ['internal', 'Internal'],
  ['research', 'Research'],
  ['blog', 'Content'],
]

function nowIso() {
  return new Date().toISOString()
}

function readJsonIfExists(filePath, fallback = null) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function readTextIfExists(filePath, fallback = '') {
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return fallback
  }
}

function exists(filePath) {
  try {
    return Boolean(filePath) && fs.existsSync(filePath)
  } catch {
    return false
  }
}

function statSafe(filePath) {
  try {
    return fs.statSync(filePath)
  } catch {
    return null
  }
}

function normalizeKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function canonicalDepartmentName(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return 'Nettie'
  const lower = raw.toLowerCase()
  const aliases = {
    ivy: 'Funboy',
    funboy: 'Funboy',
    withincore: 'Perry',
    'within core': 'Perry',
    core: 'Perry',
    sam: 'Torina',
    nexus: 'Van',
    forge: 'Van',
    blueprint: 'Van',
    warden: 'Van',
    prism: 'Van',
    pulse: 'Van',
    sessions: 'Van',
    signaldoc: 'Van',
    lock: 'Perry',
    vault: 'Perry',
    sentry: 'Perry',
    calamity: 'Perry',
    quill: 'Torina',
    scribe: 'Torina',
    frame: 'Torina',
    polish: 'Torina',
    ledger: 'Dana',
    anvil: 'Dana',
    reserve: 'Dana',
    portfolio: 'Dana',
    clerk: 'Icky',
    anchor: 'Icky',
    orderly: 'Icky',
    table: 'Icky',
    case: 'Icky',
    bea: 'Icky',
    drift: 'Funboy',
    heatmap: 'Funboy',
    scout: 'Funboy',
    rank: 'Funboy',
    rollup: 'Funboy',
    sis: 'Funboy',
    lab: 'Rab',
    model: 'Rab',
    pilot: 'Rab',
    vector: 'Rab',
  }
  return aliases[lower] || raw.charAt(0).toUpperCase() + raw.slice(1)
}

function getDepartmentConfig(name = '') {
  return DEPARTMENTS.find((item) => item.name === canonicalDepartmentName(name)) || DEPARTMENTS[0]
}

function parseDate(value) {
  const ts = Date.parse(value || '')
  return Number.isFinite(ts) ? ts : null
}

function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value)
  return num.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'Unavailable'
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value)
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function inferWorkType(job = {}) {
  const text = normalizeKey(`${job.task || job.title || ''} ${job.description || ''}`)
  if (/blog|article|copy|seo|media/.test(text)) return 'blog/content'
  if (/report|summary|rollup/.test(text)) return 'report generation'
  if (/research|scan|signal|intelligence|prospect|competitor/.test(text)) return 'research'
  if (/qa|validation|audit/.test(text)) return 'QA'
  if (/deploy|vercel|release/.test(text)) return 'deployment'
  if (/build|repair|fix|patch|code|frontend|backend|api/.test(text)) return 'build repair'
  if (/image|thumbnail|graphic/.test(text)) return 'image/media'
  if (/email|smtp|imap/.test(text)) return 'email'
  if (/inspect|folder|path|inventory/.test(text)) return 'local project inspection'
  return 'chat/admin'
}

function daysAgo(dateValue) {
  const ts = parseDate(dateValue)
  if (!ts) return null
  return Math.floor((Date.now() - ts) / 86400000)
}

function inferRiskLevel(job = {}) {
  const text = normalizeKey(`${job.task || job.title || ''} ${job.description || ''} ${job.source || ''}`)
  if (/secret|credential|deploy|production|destructive|delete|billing|legal|security/.test(text)) return 'high'
  if (job.providerOutage || job.status === 'blocked' || job.status === 'failed') return 'medium'
  return 'low'
}

function inferJobProject(job = {}) {
  const sourceRef = String(job.sourceRef || job.projectPath || job.artifactPath || '')
  const title = String(job.task || job.title || '')
  const explicit = String(job.project || job.projectName || '').trim()
  if (explicit) return explicit
  if (sourceRef.includes('/projects/')) {
    const after = sourceRef.split('/projects/')[1] || ''
    const seg = after.split('/')[0]
    if (seg) return seg
  }
  const match = title.match(/^([^—:-]{4,80})\s+[—:-]/)
  return match ? match[1].trim() : 'Unassigned'
}

function inferNextAction(job = {}) {
  if (job.nextAction) return String(job.nextAction)
  if (job.status === 'blocked') return job.recoveryNote || job.outageReason || 'Resolve blocker'
  if (job.status === 'queued') return 'Route into execution'
  if (job.status === 'running') return 'Continue active execution'
  if (job.status === 'complete' || job.status === 'completed') return 'Review output and archive'
  if (job.status === 'failed') return 'Triage failure and reopen if needed'
  return 'Review status'
}

function cleanJobRow(job = {}) {
  return {
    id: job.id || job.jobId || 'unknown-job',
    task: job.task || job.title || 'Untitled job',
    project: inferJobProject(job),
    assignedAgent: canonicalDepartmentName(job.agent || job.owner || job.department || 'Nettie'),
    owner: canonicalDepartmentName(job.owner || job.department || job.agent || 'Nettie'),
    department: canonicalDepartmentName(job.department || job.owner || job.agent || 'Nettie'),
    status: job.status || 'queued',
    stage: job.stage || job.phase || 'SCOPED',
    priority: job.priority || 'P1',
    riskLevel: inferRiskLevel(job),
    createdAt: job.createdAt || job.timestamps?.created || null,
    updatedAt: job.updatedAt || job.timestamps?.updated || null,
    nextAction: inferNextAction(job),
    routeStatus: job.routeStatus || job.status || 'queued',
    source: job.source || job.sourceType || 'mission-control',
    blockedReason: job.blockedReason || job.recoveryNote || job.outageReason || null,
    workerId: job.workerId || null,
  }
}

function runShell(command, cwd = undefined) {
  try {
    const result = spawnSync('bash', ['-lc', command], { encoding: 'utf8', cwd, timeout: 15000 })
    return {
      ok: result.status === 0,
      stdout: String(result.stdout || '').trim(),
      stderr: String(result.stderr || '').trim(),
      status: result.status,
    }
  } catch (error) {
    return { ok: false, stdout: '', stderr: error.message, status: 1 }
  }
}

function detectFramework(projectPath, packageJson = null) {
  const pkg = packageJson || readJsonIfExists(path.join(projectPath, 'package.json'), {}) || {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  if (deps.next || exists(path.join(projectPath, 'next.config.js')) || exists(path.join(projectPath, 'next.config.mjs'))) return 'Next.js'
  if (deps.vite || exists(path.join(projectPath, 'vite.config.js')) || exists(path.join(projectPath, 'vite.config.ts'))) return 'Vite/React'
  if (deps.react) return 'React'
  if (deps.fastify) return 'Fastify'
  if (deps.express) return 'Express'
  if (deps.typescript && exists(path.join(projectPath, 'tsconfig.json'))) return 'TypeScript App'
  return 'Unknown'
}

function detectBackendFramework(projectPath, packageJson = null) {
  const pkg = packageJson || readJsonIfExists(path.join(projectPath, 'package.json'), {}) || {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  if (deps.fastify) return 'Fastify'
  if (deps.express) return 'Express'
  if (deps['@nestjs/core']) return 'NestJS'
  if (exists(path.join(projectPath, 'server.js'))) return 'Node server.js'
  return 'Unknown'
}

function detectDatabase(projectPath, packageJson = null) {
  const pkg = packageJson || readJsonIfExists(path.join(projectPath, 'package.json'), {}) || {}
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  const keys = Object.keys(deps)
  if (keys.some((key) => /pg|postgres/i.test(key))) return 'Postgres'
  if (keys.some((key) => /sqlite/i.test(key))) return 'SQLite'
  if (keys.some((key) => /mysql/i.test(key))) return 'MySQL'
  if (keys.some((key) => /mongoose|mongodb/i.test(key))) return 'MongoDB'
  if (keys.some((key) => /firebase|firestore/i.test(key))) return 'Firebase'
  return 'Unknown'
}

function detectProjectType(projectName = '', projectPath = '') {
  const base = normalizeKey(`${projectName} ${projectPath}`)
  for (const [token, label] of PROJECT_TYPE_HINTS) {
    if (base.includes(token)) return label
  }
  return 'Tool'
}

function collectCandidateProjectPaths({ rootDir, projectRoots = [], registry = {}, jobs = [] }) {
  const paths = new Set([rootDir])
  for (const rootPath of projectRoots) {
    try {
      if (!exists(rootPath)) continue
      for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const candidate = path.join(rootPath, entry.name)
        if (exists(path.join(candidate, 'package.json')) || exists(path.join(candidate, '.git')) || exists(path.join(candidate, 'docs', 'project-state-ledger.md'))) {
          paths.add(candidate)
        }
      }
    } catch {}
  }

  const registryEntries = [
    ...(registry.active || []),
    ...(registry.queued || []),
    ...(registry.running || []),
    ...(registry.paused || []),
    ...(registry.blocked || []),
    ...(registry.completedRecent || []),
  ]

  for (const entry of [...jobs, ...registryEntries]) {
    for (const candidate of [entry.projectPath, entry.artifactPath, entry.sourceRef]) {
      const value = String(candidate || '')
      if (!value.includes('/home/patrick/')) continue
      const direct = value.endsWith('.md') || value.endsWith('.json') ? path.dirname(value) : value
      const normalized = direct.includes('/docs/') ? direct.split('/docs/')[0] : direct
      if (exists(normalized)) paths.add(normalized)
      if (normalized.includes('/mission-control/archive/sandboxes/')) {
        const sandboxRoot = normalized.split('/shared-ledger')[0]
        if (exists(sandboxRoot)) paths.add(sandboxRoot)
      }
    }
  }

  return [...paths]
    .map((value) => {
      try { return fs.realpathSync(value) } catch { return value }
    })
    .filter(Boolean)
    .sort()
}

function buildLocalProjects({ rootDir, projectRoots = [], registry = {}, jobs = [] }) {
  const ssResult = runShell("ss -ltn | awk 'NR>1 {print $4}' | sed 's/.*://g' | sort -u")
  const openPorts = new Set(String(ssResult.stdout || '').split(/\s+/).filter(Boolean))
  const paths = collectCandidateProjectPaths({ rootDir, projectRoots, registry, jobs })
  const projectRows = []

  for (const projectPath of paths.slice(0, 40)) {
    const packageJson = readJsonIfExists(path.join(projectPath, 'package.json'), {}) || {}
    const ledgerPath = exists(path.join(projectPath, 'docs', 'project-state-ledger.md'))
      ? path.join(projectPath, 'docs', 'project-state-ledger.md')
      : exists(path.join(projectPath, 'shared-ledger', 'project-state-ledger.md'))
        ? path.join(projectPath, 'shared-ledger', 'project-state-ledger.md')
        : null
    const ledgerText = readTextIfExists(ledgerPath, '')
    const projectName = packageJson.name || ledgerText.match(/^Project:\s*(.+)$/m)?.[1]?.trim() || path.basename(projectPath)
    const owner = ledgerText.match(/^Owner:\s*(.+)$/m)?.[1]?.trim() || 'Van'
    const envPresent = ['.env', '.env.local', '.env.development'].some((name) => exists(path.join(projectPath, name)))
    const gitRepo = exists(path.join(projectPath, '.git'))
    const branch = gitRepo ? runShell('git rev-parse --abbrev-ref HEAD', projectPath).stdout || 'unknown' : 'unknown'
    const gitStatus = gitRepo ? (runShell('git status --porcelain', projectPath).stdout ? 'dirty' : 'clean') : 'not-a-repo'
    const framework = detectFramework(projectPath, packageJson)
    const backend = detectBackendFramework(projectPath, packageJson)
    const database = detectDatabase(projectPath, packageJson)
    const frontendPort = projectPath === rootDir ? '5173' : 'unknown'
    const backendPort = projectPath === rootDir ? '4174' : ledgerText.match(/port\s+(\d{4,5})/i)?.[1] || 'unknown'
    const frontendStatus = openPorts.has(frontendPort) ? 'running' : frontendPort === 'unknown' ? 'unknown' : 'stopped'
    const backendStatus = openPorts.has(backendPort) ? 'running' : backendPort === 'unknown' ? 'unknown' : 'stopped'
    const liveUrl = frontendPort !== 'unknown' ? `http://localhost:${frontendPort}` : '—'
    const previewUrl = '—'
    const deployProvider = exists(path.join(projectPath, 'vercel.json')) ? 'Vercel' : 'Unknown'
    const packageScripts = packageJson.scripts || {}
    const buildStatus = packageScripts.build ? 'configured' : 'unknown'
    const testStatus = packageScripts.test ? 'configured' : 'unknown'
    const qaStatus = ledgerText.includes('QA') ? 'documented' : 'unknown'
    const lastVerified = statSafe(ledgerPath || path.join(projectPath, 'package.json'))?.mtime?.toISOString?.() || null
    const notes = []
    if (ledgerPath) notes.push('project ledger found')
    if (projectPath === rootDir) notes.push('Mission Control runtime')

    projectRows.push({
      id: slugify(projectPath),
      projectName,
      projectType: detectProjectType(projectName, projectPath),
      localPath: projectPath,
      frontendFramework: framework,
      backendFramework: backend,
      frontendPort,
      backendPort,
      frontendStatus,
      backendStatus,
      database,
      environmentFilePresent: envPresent ? 'yes' : 'no',
      gitRepo: gitRepo ? 'yes' : 'no',
      currentBranch: branch,
      gitStatus,
      lastBuildResult: buildStatus,
      lastTestResult: testStatus,
      lastQaResult: qaStatus,
      liveUrl,
      previewUrl,
      deploymentProvider: deployProvider,
      lastVerified,
      owner: canonicalDepartmentName(owner),
      nextAction: frontendStatus === 'stopped' && backendStatus === 'stopped' ? 'Verify runtime and run smoke test' : 'Review latest status',
      notes: notes.join(' · ') || '—',
      project: projectName,
      repoUrl: gitRepo ? projectPath : '—',
      client: '—',
      status: frontendStatus === 'running' || backendStatus === 'running' ? 'active' : 'tracked',
    })
  }

  return projectRows.sort((a, b) => String(b.lastVerified || '').localeCompare(String(a.lastVerified || '')))
}

function buildReports({ runtimeDir }) {
  const reports = []
  const danaRunsDir = path.join(runtimeDir, 'dana', 'runs')
  if (exists(danaRunsDir)) {
    for (const runDirName of fs.readdirSync(danaRunsDir).slice(-60)) {
      const runDir = path.join(danaRunsDir, runDirName)
      if (!statSafe(runDir)?.isDirectory()) continue
      const manifest = readJsonIfExists(path.join(runDir, 'manifest.json'), {}) || {}
      const run = readJsonIfExists(path.join(runDir, 'run.json'), {}) || {}
      const reportReady = readJsonIfExists(path.join(runDir, 'research', 'report_ready.json'), null)
      const reportIntel = readJsonIfExists(path.join(runDir, 'report_intelligence.json'), null)
      const weeklyReport = readJsonIfExists(path.join(runDir, 'weekly_operating_report.json'), null)
      const title = reportIntel?.title || weeklyReport?.title || manifest?.reportName || run?.jobName || runDirName
      const createdAt = run?.completedAt || run?.finishedAt || run?.createdAt || statSafe(runDir)?.mtime?.toISOString?.() || null
      reports.push({
        id: slugify(runDirName),
        title,
        department: 'Dana',
        createdBy: 'Dana',
        createdAt,
        reportType: runDirName.includes('weekly') ? 'weekly' : runDirName.includes('daily') ? 'daily' : 'report',
        status: reportReady?.ready === false ? 'pending' : 'generated',
        emailedTo: 'Patrick',
        body: reportIntel?.summary || weeklyReport?.summary || manifest?.summary || 'Report artifact available on disk.',
        relatedJobs: [],
        relatedProjects: [run?.project || manifest?.project || 'Dana Intelligence'],
        path: runDir,
      })
    }
  }

  const nettieDigest = readJsonIfExists(path.join(runtimeDir, 'email-governance', 'nettie', 'executive_digest_latest.json'), null)
  if (nettieDigest) {
    reports.push({
      id: 'nettie-executive-digest-latest',
      title: nettieDigest.subject || 'Nettie Executive Digest',
      department: 'Nettie',
      createdBy: 'Nettie',
      createdAt: nettieDigest.createdAt || nettieDigest.generatedAt || statSafe(path.join(runtimeDir, 'email-governance', 'nettie', 'executive_digest_latest.json'))?.mtime?.toISOString?.() || null,
      reportType: 'executive-digest',
      status: 'generated',
      emailedTo: nettieDigest.to || 'Patrick',
      body: nettieDigest.preview || nettieDigest.summary || 'Latest executive digest available.',
      relatedJobs: [],
      relatedProjects: [],
      path: path.join(runtimeDir, 'email-governance', 'nettie', 'executive_digest_latest.json'),
    })
  }

  return reports.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 50)
}

function buildCosts({ state = {}, workers = [], jobs = [], runtimeDir }) {
  const modelChangeLog = readJsonIfExists(path.join(runtimeDir, 'dana', 'governance', 'model_change_log.json'), []) || []
  const telemetry = loadTelemetry(runtimeDir)
  const session = telemetry.session || {}
  const cooldownState = telemetry.cooldowns || { providers: [] }
  const modelAssignmentMatrix = telemetry.modelAssignments?.assignments || []
  const apiKeyTracking = telemetry.apiKeyTracking?.aliases || []

  const usageRows = workers.map((worker) => {
    const startedAt = worker.startedAt || null
    const completedAt = worker.endedAt || null
    const duration = startedAt && completedAt ? formatDurationMs(parseDate(completedAt) - parseDate(startedAt)) : '—'
    const job = jobs.find((entry) => entry.id === worker.jobId || entry.jobId === worker.jobId) || {}
    return {
      provider: worker.executor === 'codex' ? 'openai-codex' : state.system?.selectedExecutor || 'unknown',
      model: worker.executor === 'codex' ? 'gpt-5.4' : state.system?.selectedExecutor || 'unknown',
      modelVersion: state.system?.codexVersion || state.system?.version || 'unknown',
      taskType: inferWorkType(job),
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCost: null,
      startedAt,
      completedAt,
      duration,
      jobId: worker.jobId || null,
      department: canonicalDepartmentName(job.owner || job.department || job.agent || 'Nettie'),
      project: inferJobProject(job),
      notes: 'Exact token and cost telemetry not yet wired for this execution row; runtime metadata only.',
      confidence: 'unavailable',
      activeAgent: canonicalDepartmentName(job.agent || job.owner || job.department || 'Nettie'),
    }
  })

  if (session.tokensUsed || session.model) {
    usageRows.unshift({
      provider: session.provider || state.system?.selectedExecutor || 'unknown',
      model: session.model || 'unknown',
      modelVersion: session.modelVersion || session.model || 'unknown',
      taskType: session.taskType || 'chat/admin',
      inputTokens: null,
      outputTokens: null,
      totalTokens: session.tokensUsed ?? null,
      estimatedCost: null,
      startedAt: null,
      completedAt: session.capturedAt || null,
      duration: session.elapsedMinutes ? formatDurationMs(Number(session.elapsedMinutes) * 60000) : '—',
      jobId: session.jobId || null,
      department: canonicalDepartmentName(session.department || 'Nettie'),
      project: session.project || 'Mission Control',
      notes: session.notes || 'Estimated from visible shell telemetry.',
      confidence: session.confidence || 'estimated',
      activeAgent: session.agent || 'Hermes',
    })
  }

  const deptUsageBase = DEPARTMENTS.map((department) => ({
    department: department.name,
    estimatedCost: null,
    trackedJobs: jobs.filter((job) => canonicalDepartmentName(job.owner || job.department || job.agent || '') === department.name).length,
    trackingStatus: 'unavailable',
    model: modelAssignmentMatrix.find((entry) => canonicalDepartmentName(entry.department) === department.name)?.defaultModel || 'unknown',
    workType: 'mixed',
    tokens: null,
  }))

  const sessionDept = canonicalDepartmentName(session.department || '')
  const costByDepartment = deptUsageBase.map((entry) => {
    if (entry.department !== sessionDept || !session.tokensUsed) return entry
    return {
      ...entry,
      tokens: session.tokensUsed,
      trackingStatus: session.confidence?.includes('estimated') ? 'estimated' : 'actual',
    }
  })

  const workTypes = ['chat/admin', 'coding', 'local project inspection', 'build repair', 'QA', 'report generation', 'research', 'blog/content', 'image/media', 'email', 'deployment', 'security review']
  const costByWorkType = workTypes.map((type) => ({
    workType: type,
    estimatedCost: null,
    trackingStatus: session.taskType === type && session.tokensUsed ? (session.confidence?.includes('estimated') ? 'estimated' : 'actual') : 'unavailable',
    tokens: session.taskType === type ? session.tokensUsed ?? null : null,
  }))

  const percentUsed = Number(session.percentUsed || 0)
  const highUseWarning = percentUsed >= 85
    ? 'High burn rate — approaching session cap. Defer non-critical heavy work.'
    : percentUsed >= 70
      ? 'Elevated burn rate — consider batching research and report generation.'
      : 'Burn rate currently within manageable range.'

  const activeCooldown = (cooldownState.providers || []).find((provider) => provider.status === 'cooldown') || null
  const activeModelUsage = {
    provider: session.provider || state.system?.selectedExecutor || 'unknown',
    model: session.model || 'unknown',
    version: session.modelVersion || session.model || 'unknown',
    activeDepartment: canonicalDepartmentName(session.department || 'Nettie'),
    activeAgent: session.agent || 'Hermes',
    activeJob: session.jobId || 'No linked job',
    activeProject: session.project || 'Mission Control',
    currentBurnStatus: percentUsed >= 85 ? 'high-burn' : percentUsed >= 70 ? 'elevated-burn' : 'normal',
  }

  const dashboardWarning = percentUsed >= 70 || activeCooldown
    ? {
        level: percentUsed >= 85 || activeCooldown ? 'critical' : 'warning',
        title: activeCooldown ? 'Provider cooldown / burn warning' : 'High token burn rate detected',
        message: activeCooldown
          ? `Execution paused risk: ${activeCooldown.provider} cooldown, reset ETA ${activeCooldown.estimatedResetTime || 'unknown'}.`
          : `Current session is using about ${formatNumber(session.tokensPerMinute, 0)} tokens/minute with ~${formatNumber(session.estimatedMinutesRemaining, 0)} minutes remaining.`,
      }
    : null

  return {
    summary: {
      activeProvider: session.provider || state.system?.selectedExecutor || 'unknown',
      activeModel: session.model || (workers[0]?.executor === 'codex' ? 'gpt-5.4' : state.system?.selectedExecutor || 'unknown'),
      activeModelVersion: session.modelVersion || state.system?.codexVersion || state.system?.version || 'unknown',
      currentSessionTokenEstimate: session.tokensUsed != null ? `${formatNumber(session.tokensUsed)} / ${formatNumber(session.tokenCap)} tokens` : 'Unavailable',
      todayTotalTokenUse: session.tokensUsed != null ? formatNumber(session.tokensUsed) : 'Unavailable',
      weeklyTokenUse: 'Unavailable',
      monthlyTokenUse: 'Unavailable',
      estimatedCostToday: 'Unavailable',
      estimatedCostThisWeek: 'Unavailable',
      estimatedCostThisMonth: 'Unavailable',
      tokensUsed: session.tokensUsed ?? null,
      tokenCap: session.tokenCap ?? null,
      percentUsed: session.percentUsed ?? null,
      tokensRemaining: session.tokensRemaining ?? null,
      elapsedMinutes: session.elapsedMinutes ?? null,
      source: session.source ? `${session.source} (${session.confidence || 'estimated'})` : 'No native token meter is currently wired into Mission Control.',
      lastUpdated: session.capturedAt || nowIso(),
      confidence: session.confidence || 'partial',
    },
    usageRows,
    burnRate: {
      tokensPerMinute: session.tokensPerMinute != null ? formatNumber(session.tokensPerMinute, 0) : 'Unavailable',
      tokensPerHour: session.tokensPerHour != null ? formatNumber(session.tokensPerHour, 0) : 'Unavailable',
      rollingFiveMinute: session.rollingFiveMinuteTokensPerMinute != null ? formatNumber(session.rollingFiveMinuteTokensPerMinute, 0) : 'Unavailable',
      rollingFifteenMinute: session.rollingFifteenMinuteTokensPerMinute != null ? formatNumber(session.rollingFifteenMinuteTokensPerMinute, 0) : 'Unavailable',
      rollingSessionAverage: session.rollingSessionAverageTokensPerMinute != null ? formatNumber(session.rollingSessionAverageTokensPerMinute, 0) : 'Unavailable',
      estimatedTimeUntilCap: session.estimatedHoursRemaining != null ? `${formatNumber(session.estimatedHoursRemaining, 2)} hours` : 'Unavailable',
      highUseWarning,
      recommendedPauseWindow: activeCooldown ? activeCooldown.recommendedAction : 'Batch research/report work during low-urgency windows and preserve active build time for critical tasks.',
    },
    cooldown: {
      provider: activeCooldown?.provider || session.provider || state.system?.selectedExecutor || 'unknown',
      model: activeCooldown?.model || session.model || (workers[0]?.executor === 'codex' ? 'gpt-5.4' : state.system?.selectedExecutor || 'unknown'),
      cooldownStatus: activeCooldown?.status || 'no-active-cooldown-detected',
      cooldownStarted: activeCooldown?.capturedAt || null,
      estimatedResetTime: activeCooldown?.estimatedResetTime || null,
      knownLimitType: activeCooldown?.errorType || 'not-tracked',
      nextRecommendedModel: state.system?.fallbackExecutor || 'unknown',
      fallbackSafe: activeCooldown ? activeCooldown.fallbackResult !== 'failed/unavailable' : Boolean(state.system?.fallbackExecutor),
      retryDelaySeconds: activeCooldown?.retryDelaySeconds ?? null,
      providerQuotaResetSeconds: activeCooldown?.providerQuotaResetSeconds ?? null,
      fallbackAttempted: activeCooldown?.fallbackAttempted ?? false,
      fallbackResult: activeCooldown?.fallbackResult || 'not-attempted',
    },
    activeModelUsage,
    modelChangeLog: Array.isArray(modelChangeLog) ? modelChangeLog.slice(-25).reverse() : [],
    costByDepartment,
    costByWorkType,
    modelAssignmentMatrix,
    apiKeyTracking,
    dashboardWarning,
    schedulingRecommendation: [
      'Expensive research should be scheduled during lower-activity windows.',
      'Blog and report generation should be batched when possible.',
      'Heavy token work should not overlap urgent build and QA windows.',
      'No model switching should occur without an entry in the model-change log.',
    ],
  }
}

function buildSecurity({ jobs = [], recoveryLedger = null, ciRegister = null, health = null }) {
  const entries = recoveryLedger?.entries || []
  const ciEntries = ciRegister?.entries || []
  const riskyJobs = jobs.filter((job) => inferRiskLevel(job) === 'high').map(cleanJobRow).slice(0, 50)
  return {
    queue: riskyJobs,
    secretsStatus: 'Secrets are redacted in executor output. Credential inventories are not exposed in UI.',
    riskyJobs,
    destructiveActionRequests: riskyJobs.filter((job) => /delete|destructive|wipe/i.test(job.task)),
    productionSensitiveActions: riskyJobs.filter((job) => /deploy|production/i.test(job.task)),
    permissionIssues: ciEntries.filter((entry) => /permission|access/i.test(`${entry.title} ${entry.description}`)).slice(0, 20),
    dependencyScanResults: [],
    exposedTokenWarnings: entries.filter((entry) => entry.providerOutage).slice(0, 20),
    approvals: jobs.filter((job) => canonicalDepartmentName(job.owner || job.department || '') === 'Perry' && (job.status === 'blocked' || job.status === 'queued')).map(cleanJobRow).slice(0, 20),
    reports: ciEntries.slice(0, 10),
    health,
  }
}

function buildQa({ jobs = [], ciRegister = null, health = null }) {
  const qaJobs = jobs.filter((job) => /QA/i.test(job.stage || '') || /qa/i.test(`${job.task || ''} ${job.description || ''}`)).map(cleanJobRow)
  const ciEntries = ciRegister?.entries || []
  return {
    summary: {
      openQaJobs: qaJobs.filter((job) => !['complete', 'completed', 'failed', 'cancelled'].includes(job.status)).length,
      blockedQaJobs: qaJobs.filter((job) => job.status === 'blocked' || job.status === 'failed').length,
      ciOpenIssues: ciEntries.filter((entry) => entry.status === 'open').length,
      lastUpdated: health?.checkedAt || nowIso(),
    },
    jobs: qaJobs.slice(0, 100),
    checks: [
      { name: 'Frontend build', status: health?.frontendBuild ?? 'unknown', source: 'build pipeline' },
      { name: 'Backend syntax', status: health?.backendCheck ?? 'unknown', source: 'server validation' },
      { name: 'Ledger health', status: health?.ledgerStatus ?? 'unknown', source: 'runtime/jobs.json' },
      { name: 'Route health', status: health?.routeHealth ?? 'unknown', source: 'frontend route inventory' },
      { name: 'Security QA gate', status: 'available', source: '/api/perry/qa-gate' },
    ],
    ciEntries: ciEntries.slice(0, 50),
  }
}

function buildIntegrations({ rootDir, state = {} }) {
  return [
    {
      id: 'telegram',
      name: 'Telegram',
      status: state.system?.updatedAt ? 'configured-runtime' : 'unknown',
      detail: 'Inbound bridge available via /api/telegram/* routes.',
      target: '/api/telegram/status',
    },
    {
      id: 'gmail',
      name: 'Gmail / SMTP / IMAP',
      status: exists('/home/patrick/.config/nettie-email/config.toml') ? 'configured' : 'unknown',
      detail: exists('/home/patrick/.config/nettie-email/config.toml') ? 'Local email config detected.' : 'Email config not detected.',
      target: '/home/patrick/.config/nettie-email/config.toml',
    },
    {
      id: 'github',
      name: 'GitHub',
      status: exists(path.join(rootDir, '.git')) ? 'local-repo' : 'unknown',
      detail: exists(path.join(rootDir, '.git')) ? 'Mission Control is in a git repository.' : 'No git repository detected.',
      target: path.join(rootDir, '.git'),
    },
    {
      id: 'vercel',
      name: 'Vercel',
      status: exists(path.join(rootDir, 'vercel.json')) ? 'configured' : 'unknown',
      detail: exists(path.join(rootDir, 'vercel.json')) ? 'vercel.json present.' : 'No vercel.json in Mission Control root.',
      target: path.join(rootDir, 'vercel.json'),
    },
    {
      id: 'hermes',
      name: 'Hermes / Local Shell',
      status: state.system?.hermesAvailable ? 'available' : 'unavailable',
      detail: state.system?.hermesAvailable ? 'Hermes runtime detected.' : 'Hermes runtime unavailable.',
      target: 'hermes',
    },
    {
      id: 'codex',
      name: 'Codex Executor',
      status: state.system?.codexAvailable ? 'available' : 'unavailable',
      detail: state.system?.codexAvailable ? state.system?.codexVersion || 'Codex detected.' : 'Codex unavailable.',
      target: 'codex',
    },
  ]
}

function buildDecisions({ instructionState = null, recoveryLedger = null }) {
  const rules = Object.values(instructionState?.rules || {}).flat ? Object.values(instructionState.rules).flat() : []
  const decisions = []
  for (const rule of rules.filter(Boolean).slice(0, 50)) {
    decisions.push({
      id: slugify(`${rule.domain || 'rule'}-${rule.intent || rule.rule || Math.random()}`),
      date: rule.updatedAt || rule.createdAt || nowIso(),
      decision: rule.rule || rule.intent || 'Operational rule',
      reason: rule.action || 'require',
      owner: 'Nettie',
      project: rule.domain || 'global',
      status: rule.status || 'active',
    })
  }

  for (const entry of (recoveryLedger?.entries || []).filter((item) => item.providerOutage).slice(0, 20)) {
    decisions.push({
      id: slugify(`outage-${entry.jobId}`),
      date: entry.lastUpdate || nowIso(),
      decision: `Provider outage handling for ${entry.jobId}`,
      reason: entry.outageReason || 'Provider outage',
      owner: canonicalDepartmentName(entry.owner || 'Nettie'),
      project: inferJobProject(entry),
      status: entry.status || 'blocked',
    })
  }

  return decisions.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

function buildDashboard({ state = {}, registry = {}, jobs = [], departments = [], projects = [], reports = [], health = null, costs = null, integrations = [] }) {
  const queued = registry.queued || []
  const running = registry.running || []
  const blocked = registry.blocked || []
  const approvals = jobs.filter((job) => String(job.stage || '').toUpperCase() === 'APPROVAL').map(cleanJobRow)
  const active = [...running, ...queued].map(cleanJobRow)
  const topReports = reports.slice(0, 5)
  return {
    system: state.system,
    counts: {
      jobs: jobs.length,
      activeJobs: running.length,
      queuedJobs: queued.length,
      blockedJobs: blocked.length,
      workers: state.workers?.length || 0,
      activeWorkers: (state.workers || []).filter((worker) => worker.status === 'running').length,
      completedWorkers: (state.workers || []).filter((worker) => worker.status === 'completed').length,
      agents: departments.length,
      urgentJobs: jobs.filter((job) => ['P0', 'P1'].includes(job.priority)).length,
      approvals: approvals.length,
      qa: jobs.filter((job) => /QA/i.test(job.stage || '')).length,
      projects: projects.length,
      reports: reports.length,
    },
    priorities: active.slice(0, 8),
    blockers: blocked.map(cleanJobRow).slice(0, 8),
    approvals: approvals.slice(0, 8),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
      title: department.title,
      openJobs: department.metrics.openJobs,
      blockedJobs: department.status.blockedItems,
      reports: department.reports.pendingReports,
      highRiskItems: department.metrics.highRiskItems,
    })),
    recentReports: topReports,
    costAlert: costs?.dashboardWarning || costs?.summary || null,
    costSummary: costs?.summary || null,
    systemHealth: health,
    registry,
    jobs: jobs.slice(0, 20).map(cleanJobRow),
    integrations: integrations.slice(0, 6),
  }
}

export function buildMissionControlData({
  rootDir,
  runtimeDir,
  projectRoots = [],
  state = {},
  jobs = [],
  registry = {},
  workers = [],
  recoveryLedger = null,
  ciRegister = null,
  instructionState = null,
  health = null,
}) {
  const projects = buildLocalProjects({ rootDir, projectRoots, registry, jobs })
  const reports = buildReports({ runtimeDir })
  const costs = buildCosts({ state, workers, jobs, runtimeDir })
  const integrations = buildIntegrations({ rootDir, state })
  const decisions = buildDecisions({ instructionState, recoveryLedger })

  const departments = DEPARTMENTS.map((config) => {
    const deptJobs = jobs
      .filter((job) => canonicalDepartmentName(job.owner || job.department || job.agent || '') === config.name)
      .map(cleanJobRow)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))

    const completed = deptJobs.filter((job) => ['complete', 'completed'].includes(job.status))
    const open = deptJobs.filter((job) => !['complete', 'completed', 'cancelled', 'failed'].includes(job.status))
    const blocked = deptJobs.filter((job) => job.status === 'blocked' || job.status === 'failed')
    const waitingOnUser = deptJobs.filter((job) => /approval|client|patrick/i.test(job.nextAction || ''))
    const overdue = deptJobs.filter((job) => daysAgo(job.updatedAt) !== null && daysAgo(job.updatedAt) > 7 && !['complete', 'completed', 'cancelled'].includes(job.status))
    const reportList = reports.filter((report) => canonicalDepartmentName(report.department) === config.name)
    const recentActions = deptJobs.slice(0, 10).map((job) => ({
      at: job.updatedAt,
      action: `${job.status} · ${job.task}`,
      note: job.nextAction,
    }))
    const turnaroundSamples = completed
      .map((job) => {
        const created = parseDate(job.createdAt)
        const updated = parseDate(job.updatedAt)
        return created && updated ? updated - created : null
      })
      .filter(Boolean)
    const avgTurnaroundMs = turnaroundSamples.length
      ? turnaroundSamples.reduce((sum, value) => sum + value, 0) / turnaroundSamples.length
      : null

    return {
      ...config,
      activeJobs: deptJobs.slice(0, 50),
      status: {
        currentWorkload: open.length,
        blockedItems: blocked.length,
        waitingOnUserItems: waitingOnUser.length,
        waitingOnClientItems: waitingOnUser.filter((job) => /client/i.test(job.nextAction || '')).length,
        recentlyCompletedItems: completed.length,
        overdueItems: overdue.length,
      },
      reports: {
        latestDepartmentReport: reportList[0] || null,
        generatedReports: reportList.length,
        emailedReports: reportList.filter((report) => report.emailedTo).length,
        pendingReports: reportList.filter((report) => report.status === 'pending').length,
        items: reportList.slice(0, 25),
      },
      metrics: {
        openJobs: open.length,
        completedJobs: completed.length,
        failedJobs: deptJobs.filter((job) => job.status === 'failed').length,
        averageTurnaround: formatDurationMs(avgTurnaroundMs),
        highRiskItems: deptJobs.filter((job) => job.riskLevel === 'high').length,
        tokenCostUse: config.name === 'Dana' ? 'tracked-partial' : 'not-tracked',
      },
      actions: [
        'Generate department report',
        'Create job',
        'Assign job',
        'Mark blocked',
        'Mark complete',
        'Request Perry review',
        'Request Nettie routing review',
        'Request Hermes execution',
      ],
      audit: recentActions,
      vanActiveLocalTable: config.name === 'Van' ? projects : [],
    }
  })

  const security = buildSecurity({ jobs, recoveryLedger, ciRegister, health })
  const qa = buildQa({ jobs, ciRegister, health })
  const dashboard = buildDashboard({ state, registry, jobs, departments, projects, reports, health, costs, integrations })

  return {
    departments,
    projects,
    reports,
    costs,
    security,
    qa,
    decisions,
    integrations,
    dashboard,
  }
}
