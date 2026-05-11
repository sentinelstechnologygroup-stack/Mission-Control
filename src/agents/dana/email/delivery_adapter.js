import path from 'path'
import { spawnSync } from 'child_process'
import { ensureDir, writeJson } from '../agents/research/utils.js'
import { finalizeGovernedSend, prepareGovernedEmail, queueNettieAlert, resolveGovernedRecipients } from '../../../governance/email_governance.js'

function loadMailScript() {
  return `
import json, pathlib, tomllib, smtplib, ssl, mimetypes
from email.message import EmailMessage
from email.utils import formataddr

payload = json.loads(__import__('sys').stdin.read())
config_path = payload['configPath']
with open(config_path, 'rb') as f:
    cfg = tomllib.load(f)
account = cfg['account']['address']
app_password = cfg['account']['app_password']
smtp_cfg = cfg.get('smtp', {})
host = smtp_cfg.get('host', 'smtp.gmail.com')
port = int(smtp_cfg.get('port', 587))
security = str(smtp_cfg.get('security', 'starttls')).lower()

msg = EmailMessage()
msg['Subject'] = payload['subject']
msg['From'] = formataddr((payload.get('fromName') or 'Dana', account))
msg['To'] = ', '.join(payload['to']) if isinstance(payload['to'], list) else payload['to']
if payload.get('cc'):
    msg['Cc'] = payload['cc']

text = payload.get('text') or payload.get('body') or ''
html = payload.get('html')
msg.set_content(text)
if html:
    msg.add_alternative(html, subtype='html')

for attachment in payload.get('attachments') or []:
    p = pathlib.Path(attachment)
    if not p.exists():
        continue
    mime, _ = mimetypes.guess_type(str(p))
    if mime:
        maintype, subtype = mime.split('/', 1)
    elif p.suffix.lower() == '.docx':
        maintype, subtype = 'application', 'vnd.openxmlformats-officedocument.wordprocessingml.document'
    else:
        maintype, subtype = 'application', 'octet-stream'
    msg.add_attachment(p.read_bytes(), maintype=maintype, subtype=subtype, filename=p.name)

context = ssl.create_default_context()
if security in ('ssl', 'ssl_tls', 'smtps'):
    with smtplib.SMTP_SSL(host, port, context=context) as smtp:
        smtp.login(account, app_password)
        smtp.send_message(msg)
elif security in ('starttls', 'tls'):
    with smtplib.SMTP(host, port) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()
        smtp.login(account, app_password)
        smtp.send_message(msg)
else:
    with smtplib.SMTP(host, port) as smtp:
        smtp.login(account, app_password)
        smtp.send_message(msg)
print(json.dumps({'ok': True, 'to': payload['to'], 'subject': payload['subject']}))
`
}

function buildSendLog({ payload, recipients, sendResult, payloadPath, senderIdentity }) {
  return {
    recipients,
    subject: payload.subject || null,
    attachments: (payload.attachments || []).map((file) => path.basename(file)),
    send_result: sendResult.ok ? 'SUCCESS' : 'FAIL',
    timestamp: new Date().toISOString(),
    template_used: payload.metadata?.templatePackIdentifier || null,
    canonical_report_pack_root: payload.metadata?.canonicalReportPackRoot || null,
    body_source: payload.metadata?.bodySource || null,
    payload_path: payloadPath,
    sender_identity: senderIdentity || payload.metadata?.senderIdentity || payload.fromName || null,
    send_details: {
      attempted: Boolean(sendResult.attempted),
      mode: sendResult.mode || null,
      status: sendResult.status ?? null,
      stdout: sendResult.stdout || '',
      stderr: sendResult.stderr || '',
    },
  }
}

export function sendEmailPayload(payload, options = {}) {
  const runDir = payload.metadata?.runDir || null
  const outDir = ensureDir(options.outDir || (runDir ? path.join(runDir, 'email') : path.resolve('runtime/dana/email')))
  const stamp = Date.now()
  const safeSubject = String(payload.subject || 'dana').replace(/[^a-zA-Z0-9._-]+/g, '_')
  const payloadPath = path.join(outDir, `${stamp}_${safeSubject}.json`)
  writeJson(payloadPath, payload)

  let governance = null
  let recipients = resolveGovernedRecipients(options.to || payload.metadata?.to || payload.to || [])
  let sendResult = { attempted: false, ok: false, mode: 'blocked', payloadPath, status: null, stdout: '', stderr: '' }
  let senderIdentity = payload.metadata?.senderIdentity || payload.fromName || null

  try {
    governance = prepareGovernedEmail(payload, options.to || payload.metadata?.to || payload.to || [])
    recipients = governance.recipients
    senderIdentity = governance.sender

    const shouldSend = options.send === true && payload.subject && (payload.text || payload.body)
    if (shouldSend) {
      const configPath = options.configPath || process.env.NETTIE_EMAIL_CONFIG || path.join(process.env.HOME || '', '.config/nettie-email/config.toml')
      const result = spawnSync(process.env.PYTHON || 'python3', ['-c', loadMailScript()], {
        input: JSON.stringify({
          configPath,
          subject: governance.subject,
          text: payload.text || payload.body || '',
          html: payload.html || null,
          attachments: payload.attachments || [],
          to: recipients,
          cc: options.cc || payload.metadata?.cc || '',
          fromName: payload.fromName || payload.signature?.senderName || senderIdentity || 'Dana',
        }),
        encoding: 'utf8',
        env: { ...process.env },
        timeout: 120000,
      })
      sendResult = {
        attempted: true,
        ok: result.status === 0,
        mode: 'smtp-python',
        status: result.status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        payloadPath,
      }
    } else {
      sendResult = {
        attempted: false,
        ok: false,
        mode: 'blocked',
        status: null,
        stdout: '',
        stderr: 'Governed send not attempted because send=false or body/subject was missing.',
        payloadPath,
      }
    }
  } catch (error) {
    sendResult = {
      attempted: false,
      ok: false,
      mode: 'governance-block',
      status: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      payloadPath,
    }
  }

  const sendLog = buildSendLog({ payload, recipients, sendResult, payloadPath, senderIdentity })
  const sendLogPath = path.join(outDir, `${stamp}_${safeSubject}.send_log.json`)
  writeJson(sendLogPath, sendLog)

  let governanceArtifacts = { digestPath: null, alertPath: null }
  try {
    governanceArtifacts = finalizeGovernedSend({ payload, recipients, sendResult, payloadPath, sendLogPath })
  } catch (error) {
    const alert = queueNettieAlert({
      severity: 'critical',
      sender: senderIdentity,
      subject: payload.subject,
      reason: 'governance-finalization-failed',
      recipients,
      run_id: payload.metadata?.runId || null,
      payload_path: payloadPath,
      send_log_path: sendLogPath,
      details: { error: error instanceof Error ? error.message : String(error) },
    })
    governanceArtifacts = { digestPath: null, alertPath: alert.alertPath, alertEntry: alert.alert }
  }

  return { ...sendResult, payloadPath, sendLogPath, recipients, senderIdentity, governanceArtifacts }
}
