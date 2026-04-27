import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')
const governanceConfigPath = path.join(projectRoot, 'governance', 'email-governance.config.json')
const runtimeRoot = path.join(projectRoot, 'runtime', 'email-governance')
const nettieRoot = path.join(runtimeRoot, 'nettie')
const executiveDigestQueuePath = path.join(nettieRoot, 'executive_digest_queue.jsonl')
const nettieAlertsPath = path.join(nettieRoot, 'alerts.jsonl')
const latestDigestSnapshotPath = path.join(nettieRoot, 'executive_digest_latest.json')
const latestAlertSnapshotPath = path.join(nettieRoot, 'latest_alert.json')

const fallbackGovernance = {
  version: 'fallback-email-governance',
  primaryRecipients: ['SentinelsTechnologyGroup@gmail.com', 'Patrick@SentinelsDesignLab.com'],
  authorizedSenders: {
    Nettie: { role: 'executive' },
    Dana: { role: 'department-head' },
    Van: { role: 'department-head' },
    Perry: { role: 'department-head' },
    Funboy: { role: 'department-head' },
  },
  requiredContentFields: [
    'sender',
    'report_type',
    'system_or_project',
    'current_status',
    'key_findings',
    'blockers_or_risks',
    'next_action',
    'evidence_summary',
    'run_id',
    'attachments',
  ],
  subjectRule: {
    format: '[Sender] Report Type — Project/System — Status or Hook',
    regex: '^\\[[^\\]]+\\]\\s+[^—]+\\s+—\\s+[^—]+\\s+—\\s+.+$',
  },
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
  return dirPath
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
  return filePath
}

function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`)
  return filePath
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeRecipientList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => normalizeRecipientList(item)).filter(Boolean))]
  }
  return [...new Set(normalizeText(value).split(',').map((item) => item.trim()).filter(Boolean))]
}

function loadGovernance() {
  try {
    const raw = fs.readFileSync(governanceConfigPath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallbackGovernance
  }
}

export function ensureEmailGovernanceStores() {
  ensureDir(runtimeRoot)
  ensureDir(nettieRoot)
  if (!fs.existsSync(latestDigestSnapshotPath)) {
    writeJson(latestDigestSnapshotPath, { created_at: new Date().toISOString(), records: [] })
  }
  if (!fs.existsSync(latestAlertSnapshotPath)) {
    writeJson(latestAlertSnapshotPath, { created_at: new Date().toISOString(), alerts: [] })
  }
  return {
    runtimeRoot,
    nettieRoot,
    executiveDigestQueuePath,
    nettieAlertsPath,
    latestDigestSnapshotPath,
    latestAlertSnapshotPath,
    governanceConfigPath,
  }
}

export function getEmailGovernance() {
  ensureEmailGovernanceStores()
  return loadGovernance()
}

export function resolveGovernedRecipients(value) {
  const governance = getEmailGovernance()
  const requested = normalizeRecipientList(value)
  const recipients = requested.length ? requested : normalizeRecipientList(governance.primaryRecipients)
  return [...new Set(recipients)]
}

export function ensureAuthorizedSender(senderIdentity, metadata = {}) {
  const governance = getEmailGovernance()
  const sender = normalizeText(senderIdentity || metadata.senderIdentity || metadata.sender || metadata.fromName)
  if (!sender) {
    throw new Error('Email governance requires a sender identity')
  }
  if (governance.authorizedSenders?.[sender]) {
    return sender
  }
  if (metadata.authorizedByMissionControl === true) {
    return sender
  }
  throw new Error(`Unauthorized sender for governed email path: ${sender}`)
}

export function enforcePrimaryRecipients(recipients) {
  const governance = getEmailGovernance()
  const normalizedRecipients = resolveGovernedRecipients(recipients)
  const primaryRecipients = normalizeRecipientList(governance.primaryRecipients)
  const missingPrimaryRecipients = primaryRecipients.filter((recipient) => !normalizedRecipients.includes(recipient))
  if (missingPrimaryRecipients.length) {
    throw new Error(`Primary recipients missing from governed send: ${missingPrimaryRecipients.join(', ')}`)
  }
  return {
    recipients: normalizedRecipients,
    primaryRecipients,
  }
}

export function enforceSubjectLine(subject) {
  const governance = getEmailGovernance()
  const normalizedSubject = normalizeText(subject)
  if (!normalizedSubject) {
    throw new Error('Governed email subject is required')
  }
  const pattern = new RegExp(governance.subjectRule?.regex || fallbackGovernance.subjectRule.regex)
  if (!pattern.test(normalizedSubject)) {
    throw new Error(`Subject does not satisfy governance format: ${governance.subjectRule?.format || fallbackGovernance.subjectRule.format}`)
  }
  return normalizedSubject
}

export function enforceEmailContentContract(payload = {}) {
  const governance = getEmailGovernance()
  const contract = payload.metadata?.contentContract || {}
  const requiredFields = governance.requiredContentFields || fallbackGovernance.requiredContentFields
  const missing = requiredFields.filter((field) => {
    const value = contract[field]
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || normalizeText(value) === ''
  })
  if (missing.length) {
    throw new Error(`Email content contract missing required fields: ${missing.join(', ')}`)
  }
  return contract
}

export function queueNettieAlert(alert = {}) {
  const stores = ensureEmailGovernanceStores()
  const entry = {
    created_at: new Date().toISOString(),
    severity: alert.severity || 'error',
    sender: alert.sender || null,
    subject: alert.subject || null,
    reason: alert.reason || 'email-governance-alert',
    recipients: resolveGovernedRecipients(alert.recipients || []),
    run_id: alert.run_id || null,
    payload_path: alert.payload_path || null,
    send_log_path: alert.send_log_path || null,
    details: alert.details || {},
  }
  appendJsonl(stores.nettieAlertsPath, entry)
  writeJson(stores.latestAlertSnapshotPath, entry)
  return { alertPath: stores.nettieAlertsPath, alert: entry }
}

export function queueNettieDigestEntry(entry = {}) {
  const stores = ensureEmailGovernanceStores()
  const record = {
    created_at: new Date().toISOString(),
    sender: entry.sender || null,
    report_type: entry.report_type || null,
    system_or_project: entry.system_or_project || null,
    current_status: entry.current_status || null,
    subject: entry.subject || null,
    recipients: resolveGovernedRecipients(entry.recipients || []),
    run_id: entry.run_id || null,
    send_result: entry.send_result || null,
    blockers_or_risks: entry.blockers_or_risks || [],
    next_action: entry.next_action || null,
    evidence_summary: entry.evidence_summary || null,
    artifact_refs: entry.artifact_refs || {},
  }
  appendJsonl(stores.executiveDigestQueuePath, record)
  writeJson(stores.latestDigestSnapshotPath, record)
  return { digestPath: stores.executiveDigestQueuePath, digestEntry: record }
}

export function prepareGovernedEmail(payload = {}, requestedRecipients = null) {
  const sender = ensureAuthorizedSender(payload.metadata?.senderIdentity || payload.fromName, payload.metadata || {})
  const subject = enforceSubjectLine(payload.subject)
  const contentContract = enforceEmailContentContract(payload)
  const { recipients, primaryRecipients } = enforcePrimaryRecipients(requestedRecipients || payload.metadata?.to || payload.to || [])
  return {
    sender,
    subject,
    recipients,
    primaryRecipients,
    contentContract,
    governance: getEmailGovernance(),
  }
}

export function finalizeGovernedSend({ payload = {}, recipients = [], sendResult = {}, payloadPath = null, sendLogPath = null }) {
  const contentContract = payload.metadata?.contentContract || {}
  const digest = queueNettieDigestEntry({
    sender: payload.metadata?.senderIdentity || payload.fromName || contentContract.sender,
    report_type: contentContract.report_type,
    system_or_project: contentContract.system_or_project,
    current_status: contentContract.current_status,
    subject: payload.subject,
    recipients,
    run_id: contentContract.run_id || payload.metadata?.runId || null,
    send_result: sendResult.ok ? 'SUCCESS' : 'FAIL',
    blockers_or_risks: contentContract.blockers_or_risks || [],
    next_action: contentContract.next_action || null,
    evidence_summary: contentContract.evidence_summary || null,
    artifact_refs: {
      payload_path: payloadPath,
      send_log_path: sendLogPath,
      report_run_dir: payload.metadata?.runDir || null,
      canonical_report_pack_root: payload.metadata?.canonicalReportPackRoot || null,
    },
  })

  let alert = null
  if (!sendResult.ok) {
    alert = queueNettieAlert({
      severity: sendResult.attempted ? 'critical' : 'warning',
      sender: payload.metadata?.senderIdentity || payload.fromName || contentContract.sender,
      subject: payload.subject,
      reason: sendResult.attempted ? 'governed-report-send-failed' : 'governed-report-send-blocked',
      recipients,
      run_id: contentContract.run_id || payload.metadata?.runId || null,
      payload_path: payloadPath,
      send_log_path: sendLogPath,
      details: {
        send_result: sendResult.ok ? 'SUCCESS' : 'FAIL',
        attempted: Boolean(sendResult.attempted),
        mode: sendResult.mode || null,
        status: sendResult.status ?? null,
        stdout: sendResult.stdout || '',
        stderr: sendResult.stderr || '',
      },
    })
  }

  return {
    digestPath: digest.digestPath,
    digestEntry: digest.digestEntry,
    alertPath: alert?.alertPath || null,
    alertEntry: alert?.alert || null,
  }
}
