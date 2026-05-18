import fs from 'fs'
import path from 'path'

export const REQUIRED_AGENT_FILES = [
  'agent.md',
  'AGENTS.md',
  'dependencies.md',
  'handoffs.md',
  'IDENTITY.md',
  'LOGIC.md',
  'MEMORY.md',
  'ownership.md',
  'prompt.md',
  'SOUL.md',
  'TASKS.md',
  'TOOLS.md',
]

export const EXECUTIVE_AGENTS = ['Nettie', 'Van', 'Perry', 'Dana', 'Torina', 'Icky', 'Funboy', 'Rab']

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf8') } catch { return '' }
}

function summarize(text = '', max = 280) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function mdPath(agentDir, name) {
  return path.join(agentDir, name)
}

export function loadAgentFilesystem(rootDir, { includeText = false } = {}) {
  if (!rootDir || !fs.existsSync(rootDir)) return { rootDir, agents: [], byId: {} }
  const agents = []
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const agentDir = path.join(rootDir, entry.name)
    const files = fs.readdirSync(agentDir).filter((name) => fs.statSync(path.join(agentDir, name)).isFile()).sort()
    const missingRequiredFiles = REQUIRED_AGENT_FILES.filter((name) => !files.includes(name))
    const emptyFiles = files.filter((name) => {
      try { return fs.statSync(path.join(agentDir, name)).size === 0 } catch { return false }
    })
    const staleFiles = files.filter((name) => /^new text document/i.test(name))
    const profile = {
      id: entry.name.toLowerCase(),
      displayName: entry.name,
      rootPath: agentDir,
      files,
      missingRequiredFiles,
      emptyFiles,
      staleFiles,
      requiredFileCount: REQUIRED_AGENT_FILES.length,
      complete: missingRequiredFiles.length === 0 && emptyFiles.length === 0,
      fileStats: Object.fromEntries(files.map((name) => [name, fs.statSync(path.join(agentDir, name)).size])),
      surfaces: {
        identity: summarize(safeRead(mdPath(agentDir, 'IDENTITY.md'))),
        ownership: summarize(safeRead(mdPath(agentDir, 'ownership.md'))),
        tools: summarize(safeRead(mdPath(agentDir, 'TOOLS.md'))),
        handoffs: summarize(safeRead(mdPath(agentDir, 'handoffs.md'))),
        logic: summarize(safeRead(mdPath(agentDir, 'LOGIC.md'))),
        memory: summarize(safeRead(mdPath(agentDir, 'MEMORY.md'))),
        tasks: summarize(safeRead(mdPath(agentDir, 'TASKS.md'))),
        soul: summarize(safeRead(mdPath(agentDir, 'SOUL.md'))),
        prompt: summarize(safeRead(mdPath(agentDir, 'prompt.md'))),
        dependencies: summarize(safeRead(mdPath(agentDir, 'dependencies.md'))),
        runtimeInstructions: summarize(safeRead(mdPath(agentDir, 'AGENTS.md'))),
      },
    }
    if (includeText) {
      profile.text = Object.fromEntries(REQUIRED_AGENT_FILES.map((name) => [name, safeRead(mdPath(agentDir, name))]))
    }
    agents.push(profile)
  }
  return { rootDir, agents, byId: Object.fromEntries(agents.map((agent) => [agent.id, agent])) }
}

export function buildAgentFilesystemAudit(rootDir) {
  const loaded = loadAgentFilesystem(rootDir, { includeText: false })
  const executive = EXECUTIVE_AGENTS.map((name) => loaded.byId[name.toLowerCase()] || {
    id: name.toLowerCase(), displayName: name, missingRequiredFiles: [...REQUIRED_AGENT_FILES], emptyFiles: [], staleFiles: ['missing-directory'], complete: false,
  })
  return {
    rootDir,
    totalAgents: loaded.agents.length,
    executiveAgents: executive,
    missingRequiredCount: executive.reduce((sum, agent) => sum + agent.missingRequiredFiles.length, 0),
    emptyRequiredCount: executive.reduce((sum, agent) => sum + agent.emptyFiles.filter((f) => REQUIRED_AGENT_FILES.includes(f)).length, 0),
    staleFileCount: executive.reduce((sum, agent) => sum + agent.staleFiles.length, 0),
    allAgents: loaded.agents,
  }
}
