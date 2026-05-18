import fs from 'fs'
import path from 'path'

export const REQUIRED_AGENT_STATE_FILES = [
  'current_objectives.json',
  'unresolved_items.json',
  'institutional_memory.md',
  'recurring_failures.md',
  'operational_patterns.md',
  'last_runtime_snapshot.json',
  'cross_agent_relationships.json',
]

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf8') } catch { return '' }
}

function summarize(text = '', max = 280) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function summarizeJsonArray(filePath, key) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const value = parsed?.[key]
    if (Array.isArray(value)) return value.slice(0, 5)
    return value ?? parsed
  } catch {
    return null
  }
}

export function loadAgentStateFilesystem(rootDir) {
  if (!rootDir || !fs.existsSync(rootDir)) return { rootDir, agents: [], byId: {} }
  const agents = []
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const agentDir = path.join(rootDir, entry.name)
    const files = fs.readdirSync(agentDir).filter((name) => fs.statSync(path.join(agentDir, name)).isFile()).sort()
    const missingRequiredFiles = REQUIRED_AGENT_STATE_FILES.filter((name) => !files.includes(name))
    const invalidJsonFiles = files.filter((name) => name.endsWith('.json') && (() => { try { JSON.parse(fs.readFileSync(path.join(agentDir, name), 'utf8')); return false } catch { return true } })())
    const staleFiles = files.filter((name) => /^new text document/i.test(name))
    const profile = {
      id: entry.name.toLowerCase(),
      displayName: entry.name,
      rootPath: agentDir,
      files,
      missingRequiredFiles,
      invalidJsonFiles,
      staleFiles,
      complete: missingRequiredFiles.length === 0 && invalidJsonFiles.length === 0,
      summaries: {
        currentObjectives: summarizeJsonArray(path.join(agentDir, 'current_objectives.json'), 'currentObjectives'),
        unresolvedItems: summarizeJsonArray(path.join(agentDir, 'unresolved_items.json'), 'unresolvedItems'),
        institutionalMemory: summarize(safeRead(path.join(agentDir, 'institutional_memory.md'))),
        recurringFailures: summarize(safeRead(path.join(agentDir, 'recurring_failures.md'))),
        operationalPatterns: summarize(safeRead(path.join(agentDir, 'operational_patterns.md'))),
        lastRuntimeSnapshot: summarizeJsonArray(path.join(agentDir, 'last_runtime_snapshot.json'), 'summary'),
        crossAgentRelationships: summarizeJsonArray(path.join(agentDir, 'cross_agent_relationships.json'), 'relationships'),
      },
    }
    agents.push(profile)
  }
  return { rootDir, agents, byId: Object.fromEntries(agents.map((agent) => [agent.id, agent])) }
}
