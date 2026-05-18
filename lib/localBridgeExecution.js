export const LOCAL_BRIDGE_ROUTE = 'local_bridge_queued'
export const LOCAL_BRIDGE_STALE_MS = 300000
const RISK_RE = /\b(security|auth|secret|permission|deployment|production[- ]risk|client[- ]facing|privacy)\b/i

export function isLocalBridgeEligibleTask(job = {}) {
  const t = String(job.task || job.title || job.inputPayload?.task || '').toLowerCase()
  const o = String(job.owner || job.agent || job.inputPayload?.assignedDepartmentHead || '').toLowerCase()
  return o === 'van' && (/\bci\b|lint|typecheck|test|build|repo scan|static qa|package|route\/file|syntax check/.test(t) || Array.isArray(job.inputPayload?.commands))
}

export function detectPerryRisk(text = '') {
  return RISK_RE.test(String(text || ''))
}

export function summarizeText(text = '') {
  const s = String(text || '').trim()
  return s.length > 1200 ? `${s.slice(0, 1200)}…` : s
}

export function buildLocalBridgeCommands(job = {}, scripts = {}) {
  const explicit = Array.isArray(job.inputPayload?.commands) ? job.inputPayload.commands.filter(Boolean) : []
  if (explicit.length) return explicit
  const cmds = ['git status --short && git branch --show-current']
  if (scripts.lint) cmds.push('npm run lint')
  if (scripts.typecheck) cmds.push('npm run typecheck')
  if (scripts['test:integration']) cmds.push('npm run test:integration')
  if (scripts.build) cmds.push('npm run build')
  return cmds
}

export function buildEvidenceSummary(checks = []) {
  return {
    checks,
    commandsRun: checks.map((c) => c.command),
    passCount: checks.filter((c) => c.exitCode === 0).length,
    failCount: checks.filter((c) => c.exitCode !== 0).length,
  }
}
