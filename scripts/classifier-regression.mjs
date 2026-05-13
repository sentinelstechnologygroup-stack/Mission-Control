import fs from 'fs'

const source = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8')

function extractRegex(name) {
  const m = source.match(new RegExp(`const ${name} = /(.*?)/([gimuy]*)`))
  if (!m) throw new Error(`Missing regex ${name}`)
  return new RegExp(m[1], m[2])
}

const JOB_ID_RE = extractRegex('JOB_ID_RE')
const GLOBAL_INSPECTION_PATTERNS = [
  /show me all running jobs/i,
  /what jobs are queued/i,
  /list all active jobs/i,
  /show job ledger status/i,
  /what is (?:van|hermes) working on/i,
  /show all jobs/i,
  /show current job status/i,
  /what is in the job registry/i,
  /what is currently running/i,
  /(?:job registry|job ledger|master work registry)/i,
]

function isOperationalInspectionDirective(message = '') {
  const text = String(message || '').trim()
  if (!text) return false
  if (JOB_ID_RE.test(text)) return true
  const lower = text.toLowerCase()
  const inspectionVerb = /\b(show|list|inspect|audit|report|review|analyze|analyse|summarize|summarise|provide)\b/.test(lower)
  const operationalTarget = /\b(job|jobs|queue|queued|running|ledger|registry|active work|blocked|completed|cancelled)\b/.test(lower)
  return inspectionVerb && operationalTarget
}

function isGlobalInspectionQuery(message = '') {
  const text = String(message || '').trim()
  if (!text) return false
  if (JOB_ID_RE.test(text)) return false
  if (GLOBAL_INSPECTION_PATTERNS.some((pattern) => pattern.test(text))) return true
  const lower = text.toLowerCase()
  const hasRegistrySignal = /\b(jobs?|job registry|job ledger|registry|ledger|running|queued|blocked|completed|cancelled|status)\b/.test(lower)
  const hasInspectionVerb = /\b(show|list|inspect|report|what|status)\b/.test(lower)
  return hasRegistrySignal && hasInspectionVerb
}

function isExecutorStatusQuery(message = '') {
  const text = String(message || '').trim().toLowerCase()
  if (!text) return false
  return /\b(executor|bridge|fallback|route)\b/.test(text)
    && /\b(status|current|live|confirm|connected|cooling|cooldown|available|availability|ready)\b/.test(text)
}

function detectIntent(message) {
  const msg = message.toLowerCase()
  if (
    /^nettie\s*[—–,\-]/i.test(message.trim()) &&
    /\b(hold|pause|stop|wait|do not|convert|approval)\b/.test(msg)
  ) return 'control_directive'
  if (/^nettie\s*[—–,\-]/i.test(message.trim()) && isOperationalInspectionDirective(message)) return 'control_directive'
  if (/\b(fix|update|add|modify|patch|implement)\b/.test(msg) && /\b(routing|intent|handler|server|classification|logic|regex|detectintent|handlenettieinbound)\b/.test(msg)) return 'system_update'
  if (/\bjob_(x|id|test)\b/i.test(msg)) return 'execution_command'
  if (/\b(fix|update|enforce|add|implement|patch)\b/.test(msg)) return 'execution_command'
  if (/\b(start|run|resume|restart|continue)\b/.test(msg) && JOB_ID_RE.test(msg)) return 'job_execution'
  if (JOB_ID_RE.test(msg)) return 'job_status'
  if (/^(route to \w+:|convert to execution task:|this is a system change:|create a job:)/i.test(message.trim())
    || /\bfix\s+(the\s+)?(operational|system|ledger|routing|detection|brief|ci|nettie|hermes|intent|dedupe|outage)/i.test(message)) return 'execution_command'
  if (/\b(ci register|continuous improvement|show improvements|what improved|improvement items|ci priorities)\b/.test(msg)) return 'ci_query'
  if (/\b(operational brief|full brief|brief me|company brief|exec brief)\b/.test(msg)) return 'operational_brief'
  if (/\b(active|running|queued).{0,60}\b(blocked|attention|immediate)\b/.test(msg)) return 'operational_brief'
  if (/\b(recovery ledger|show recovery|what is blocked|what is active|what needs resumed|outage|token outage)\b/.test(msg)) return 'recovery_query'
  if (isExecutorStatusQuery(message)) return 'executor_status'
  if (isGlobalInspectionQuery(message)) return 'global_inspection'
  if (/\bdispatch\s+queue\b|\bqueue\s+dispatch\b/.test(msg)) return 'dispatch_queue'
  if (/\bcleanup\s+ledger\b|\bclean\s+(up\s+)?ledger\b|\bledger\s+cleanup\b/.test(msg)) return 'cleanup_ledger'
  if (/\bmark\s+\S+\s+(complete|done|failed)\b/.test(msg)) return 'control_command'
  if (/\b(pause|stop|cancel|halt)\b/.test(msg)) return 'control_command'
  if (/\b(assign|work on|build|create|launch|start|have [a-z]+ (work|build|create|do)|tell [a-z]+ to)\b/.test(msg)) return 'assign_task'
  if (/\b(show|list|active work|what.*working|running|jobs|ledger|status|what.*(doing|running|on)|where are we with|company wide)\b/.test(msg)) return 'status_query'
  return 'chat'
}

const cases = [
  ['Nettie — summarize the current Mission Control architecture in 5 bullet points.', 'chat'],
  ['Nettie — tell me about your CI policy.', 'chat'],
  ['Nettie — explain how Van and Perry work together.', 'chat'],
  ['show queued jobs', 'global_inspection'],
  ['what is running', 'global_inspection'],
  ['inspect job_12345678', 'job_status'],
  ['assign this to Van', 'assign_task'],
  ['create a job for Perry', 'assign_task'],
]

let failed = false
for (const [message, expected] of cases) {
  const actual = detectIntent(message)
  console.log(`${actual === expected ? 'PASS' : 'FAIL'} | expected=${expected} actual=${actual} | ${message}`)
  if (actual !== expected) failed = true
}

if (failed) process.exit(1)
