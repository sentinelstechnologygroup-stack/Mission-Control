import fs from 'fs'
import path from 'path'

function nowIso() {
  return new Date().toISOString()
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function estimateTokens(text = '') {
  const chars = String(text || '').trim().length
  if (!chars) return 0
  return Math.max(1, Math.round(chars / 4))
}

function parseTime(value) {
  const ms = new Date(value || nowIso()).getTime()
  return Number.isFinite(ms) ? ms : Date.now()
}

function dayKey(value) {
  if (!value) return 'unknown'
  return String(value).slice(0, 10)
}

function classifyRowStatus(lastMessageAt, hasMessages = true) {
  const ageHours = (Date.now() - parseTime(lastMessageAt)) / (60 * 60 * 1000)
  if (!hasMessages) return 'unknown'
  if (ageHours <= 6) return 'active'
  if (ageHours <= 30 * 24) return 'inactive'
  return 'archived'
}

function summarizeSession(messages = [], fallback = {}) {
  const ordered = [...messages].sort((a, b) => parseTime(a.ts) - parseTime(b.ts))
  const startedAt = ordered[0]?.ts || fallback.startedAt || nowIso()
  const lastMessageAt = ordered.at(-1)?.ts || fallback.lastMessageAt || startedAt
  const endedAt = fallback.endedAt || (classifyRowStatus(lastMessageAt) === 'active' ? null : lastMessageAt)
  const textBody = ordered.map((message) => String(message.text || message.command || message.summary || message.replyMarkdown || '').trim()).filter(Boolean)
  const operatorText = ordered
    .filter((message) => String(message.from || message.role || '').toLowerCase() !== 'nettie')
    .map((message) => String(message.text || message.command || '').trim())
    .filter(Boolean)
    .join('\n')
  const assistantText = ordered
    .filter((message) => String(message.from || message.role || '').toLowerCase() === 'nettie' || String(message.role || '').toLowerCase().includes('assistant'))
    .map((message) => String(message.text || message.replyMarkdown || '').trim())
    .filter(Boolean)
    .join('\n')
  const totalText = textBody.join('\n')
  const estimatedTotalTokens = estimateTokens(totalText)
  const estimatedInputTokens = operatorText ? estimateTokens(operatorText) : Math.round(estimatedTotalTokens * 0.6)
  const estimatedOutputTokens = Math.max(0, estimatedTotalTokens - estimatedInputTokens)
  return {
    startedAt,
    lastMessageAt,
    endedAt,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTotalTokens,
  }
}

function buildStateChatSessions(chatHistory = []) {
  const sorted = [...chatHistory]
    .filter((message) => message && (message.ts || message.text || message.command))
    .sort((a, b) => parseTime(a.ts) - parseTime(b.ts))

  const sessions = []
  const sessionGapMs = 45 * 60 * 1000

  for (const message of sorted) {
    const channel = message.channel || 'mission-control'
    const jobId = message.jobId || null
    const key = jobId ? `job:${jobId}` : `channel:${channel}`
    const ts = parseTime(message.ts)
    let session = sessions.at(-1)
    const shouldSplit = !session || session.key !== key || (ts - parseTime(session.lastMessageAt)) > sessionGapMs

    if (shouldSplit) {
      session = {
        key,
        channel,
        jobId,
        messages: [],
        createdAt: message.ts || nowIso(),
        lastMessageAt: message.ts || nowIso(),
      }
      sessions.push(session)
    }

    session.messages.push(message)
    session.lastMessageAt = message.ts || nowIso()
    if (!session.jobId && message.jobId) session.jobId = message.jobId
  }

  return sessions.map((session, index) => {
    const summary = summarizeSession(session.messages, {
      startedAt: session.createdAt,
      lastMessageAt: session.lastMessageAt,
      endedAt: null,
    })
    const status = classifyRowStatus(summary.lastMessageAt, session.messages.length > 0)
    const lastNonNettie = [...session.messages].reverse().find((message) => String(message.from || message.role || '').toLowerCase() !== 'nettie')
    const lastNettie = [...session.messages].reverse().find((message) => String(message.from || message.role || '').toLowerCase() === 'nettie' || String(message.role || '').toLowerCase().includes('assistant'))
    return {
      conversationId: session.jobId ? `job:${session.jobId}` : `chat:${session.channel}:${index + 1}`,
      chatId: session.messages.at(-1)?.id || null,
      jobId: session.jobId || null,
      status,
      source: 'state.chat',
      agent: lastNettie?.from || lastNonNettie?.from || 'Nettie',
      department: lastNonNettie?.from || lastNettie?.from || 'Nettie',
      model: 'unknown',
      provider: 'unknown',
      startedAt: summary.startedAt,
      lastMessageAt: summary.lastMessageAt,
      endedAt: summary.endedAt,
      estimatedInputTokens: summary.estimatedInputTokens,
      estimatedOutputTokens: summary.estimatedOutputTokens,
      estimatedTotalTokens: summary.estimatedTotalTokens,
      actualTokens: null,
      confidence: 'estimated',
      notes: `Messages: ${session.messages.length}; channel: ${session.channel}; source: current chat buffer.`,
      ledgerVersion: 'v1',
    }
  })
}

function buildRecentConversationRows(recentConversations = [], seenSignatures = new Set()) {
  const rows = []
  for (const conversation of recentConversations) {
    const command = String(conversation.command || conversation.summary || '').trim()
    const reply = String(conversation.replyMarkdown || conversation.summary || '').trim()
    const signature = normalizeText([command, reply].filter(Boolean).join(' '))
    if (signature && seenSignatures.has(signature)) continue

    const startedAt = conversation.createdAt || conversation.generatedAt || nowIso()
    const lastMessageAt = conversation.createdAt || conversation.generatedAt || startedAt
    const total = estimateTokens(`${command}\n${reply}`)
    const input = command ? estimateTokens(command) : Math.round(total * 0.6)
    const output = Math.max(0, total - input)

    rows.push({
      conversationId: conversation.id ? `nettie:${conversation.id}` : `nettie:${startedAt}`,
      chatId: conversation.id || null,
      jobId: conversation.createdJobs?.[0]?.jobId || conversation.createdJobs?.[0]?.id || null,
      status: conversation.createdJobs?.length ? 'completed' : conversation.requiresApproval ? 'blocked' : 'inactive',
      source: 'runtime/nettie-conversations',
      agent: conversation.operator || 'Patrick',
      department: conversation.context?.assignedDepartmentHead || 'Nettie',
      model: 'unknown',
      provider: 'unknown',
      startedAt,
      lastMessageAt,
      endedAt: conversation.createdJobs?.length ? lastMessageAt : null,
      estimatedInputTokens: input,
      estimatedOutputTokens: output,
      estimatedTotalTokens: total,
      actualTokens: null,
      confidence: conversation.confidence?.label ? conversation.confidence.label.toLowerCase() : 'estimated',
      notes: conversation.summary || conversation.replyMarkdown?.slice(0, 160) || 'Recent Nettie conversation record.',
      ledgerVersion: 'v1',
    })
  }
  return rows
}

export function buildChatTokenLedger({ runtimeDir, state = {}, now = nowIso() } = {}) {
  const conversationDir = path.join(runtimeDir, 'nettie-conversations')
  const recentFiles = []
  try {
    if (fs.existsSync(conversationDir)) {
      for (const file of fs.readdirSync(conversationDir)) {
        if (!file.endsWith('.json')) continue
        try {
          recentFiles.push(JSON.parse(fs.readFileSync(path.join(conversationDir, file), 'utf8')))
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  const stateRows = buildStateChatSessions(Array.isArray(state.chat) ? state.chat : [])
  const seen = new Set(stateRows.map((row) => normalizeText(row.notes || row.conversationId || '')))
  const recentRows = buildRecentConversationRows(recentFiles, seen)

  const merged = [...stateRows, ...recentRows]
  const deduped = []
  const dedupeKeys = new Set()
  for (const row of merged) {
    const key = normalizeText(`${row.conversationId}|${row.jobId || ''}|${row.startedAt}|${row.lastMessageAt}|${row.notes || ''}`)
    if (dedupeKeys.has(key)) continue
    dedupeKeys.add(key)
    deduped.push(row)
  }

  const activeRows = deduped.filter((row) => row.status === 'active')
  const inactiveRows = deduped.filter((row) => row.status === 'inactive')
  const archivedRows = deduped.filter((row) => row.status === 'archived')
  const blockedRows = deduped.filter((row) => row.status === 'blocked')
  const todayKey = dayKey(now)
  const todayRows = deduped.filter((row) => dayKey(row.lastMessageAt || row.startedAt) === todayKey)
  const totalTodayTokens = todayRows.reduce((sum, row) => sum + (Number(row.estimatedTotalTokens) || 0), 0)
  const allTokens = deduped.reduce((sum, row) => sum + (Number(row.estimatedTotalTokens) || 0), 0)

  const summary = {
    totalRows: deduped.length,
    activeRows: activeRows.length,
    inactiveRows: inactiveRows.length,
    archivedRows: archivedRows.length,
    blockedRows: blockedRows.length,
    todayTotalTokenUse: totalTodayTokens,
    allTimeEstimatedTokenUse: allTokens,
    generatedAt: now,
    source: 'Mission Control chat history + Nettie conversation files',
  }

  const payload = {
    generatedAt: now,
    summary,
    rows: deduped.sort((a, b) => parseTime(b.lastMessageAt) - parseTime(a.lastMessageAt)),
    activeRows,
    inactiveRows,
    archivedRows,
    blockedRows,
  }

  const ledgerPath = path.join(runtimeDir, 'token-usage-ledger.json')
  const summaryPath = path.join(runtimeDir, 'token-usage-summary.json')
  writeJson(ledgerPath, payload)
  writeJson(summaryPath, summary)

  return {
    ledgerPath,
    summaryPath,
    ...payload,
  }
}

export function loadChatTokenLedger(runtimeDir) {
  const ledgerPath = path.join(runtimeDir, 'token-usage-ledger.json')
  const summaryPath = path.join(runtimeDir, 'token-usage-summary.json')
  return {
    ledger: readJson(ledgerPath, { rows: [], summary: {} }),
    summary: readJson(summaryPath, {}),
  }
}
