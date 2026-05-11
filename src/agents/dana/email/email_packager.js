import fs from 'fs'
import { reportPackRoot } from '../config/paths.js'

function buildSignature(run = {}) {
  const name = run.senderName || 'Dana'
  const title = run.senderTitle || 'Chief Financial Officer'
  const org = run.senderOrg || 'Mission Control'
  const line = run.senderLine || ''
  const textLines = [
    'Best regards,',
    name,
    title,
    org,
    line,
  ].filter(Boolean)
  const htmlLines = [
    '<div style="margin-top:16px;">Best regards,</div>',
    `<div style="font-weight:700; font-size:15px; margin-top:8px;">${name}</div>`,
    `<div style="color:#475569; font-size:13px;">${title}</div>`,
    `<div style="color:#64748b; font-size:13px;">${org}</div>`,
    line ? `<div style="color:#64748b; font-size:13px;">${line}</div>` : '',
  ].filter(Boolean)
  return {
    text: textLines.join('\n'),
    html: htmlLines.join(''),
    senderName: name,
    senderTitle: title,
    senderOrg: org,
  }
}

function toBulletLines(items = []) {
  return (Array.isArray(items) ? items : [items]).map((item) => String(item || '').trim()).filter(Boolean)
}

function buildContentContract({ candidate, scorecard, run = {}, mode = 'daily', reportFiles = [], reportIntelligence = null }) {
  const ticker = candidate?.ticker || 'Mission Control'
  const companyName = candidate?.companyName || 'Executive Summary'
  const recommendation = (scorecard?.recommendation || candidate?.recommendation || 'Review').toUpperCase()
  const executiveDecision = reportIntelligence?.executive_summary_candidates?.find((item) => item.ticker === ticker) || null
  const ranked = reportIntelligence?.ranked_candidates?.find((item) => item.ticker === ticker) || null
  const attachmentList = reportFiles.filter((file) => file.endsWith('.docx')).map((file) => file.split('/').pop())
  const reportType = mode === 'weekly'
    ? 'Weekly Investment Rollup'
    : mode === 'daily-small-cap'
      ? 'Daily Small-Cap Brief'
      : 'Executive Brief'
  const systemName = ticker === 'Mission Control' ? companyName : `${ticker} / ${companyName}`
  const blockersOrRisks = toBulletLines([
    executiveDecision?.primary_risk,
    ranked?.ranking_explanation?.risk || null,
  ])
  const nextAction = executiveDecision?.monitoring_trigger
    ? `Next action: ${executiveDecision.monitoring_trigger}`
    : 'Next action: review the attached package and confirm the next decision gate.'
  const keyFindings = toBulletLines([
    `Recommendation: ${recommendation}`,
    executiveDecision?.primary_thesis ? `Primary thesis: ${executiveDecision.primary_thesis}` : null,
    ranked?.ranking_explanation?.explanation ? `Ranking context: ${ranked.ranking_explanation.explanation}` : null,
  ])
  const evidenceSummary = toBulletLines([
    reportIntelligence ? 'Evidence source: report_intelligence artifact' : null,
    run.id ? `Run reference: ${run.id}` : null,
    attachmentList.length ? `Attachment list: ${attachmentList.join(', ')}` : null,
  ])
  return {
    sender: run.senderName || 'Dana',
    report_type: reportType,
    system_or_project: systemName,
    current_status: `${reportType} package ready for Patrick review`,
    key_findings: keyFindings,
    blockers_or_risks: blockersOrRisks.length ? blockersOrRisks : ['Blocker visibility checked: no explicit blockers surfaced in the current report intelligence layer.'],
    next_action: nextAction,
    evidence_summary: evidenceSummary.join(' | '),
    run_id: run.id || null,
    attachments: attachmentList,
    recommendation,
    ticker,
    company_name: companyName,
  }
}

function buildExecutiveBody({ candidate, scorecard, run = {}, mode = 'daily', reportFiles = [], reportIntelligence = null }) {
  const signature = buildSignature(run)
  const contentContract = buildContentContract({ candidate, scorecard, run, mode, reportFiles, reportIntelligence })
  const text = [
    `${contentContract.sender} Report`,
    `Sender: ${contentContract.sender}`,
    `Report type: ${contentContract.report_type}`,
    `System/Project: ${contentContract.system_or_project}`,
    `Current status: ${contentContract.current_status}`,
    `Key findings:`,
    ...contentContract.key_findings.map((item) => `- ${item}`),
    `Blockers or risks:`,
    ...contentContract.blockers_or_risks.map((item) => `- ${item}`),
    `${contentContract.next_action}`,
    `Evidence summary: ${contentContract.evidence_summary}`,
    `Run ID: ${contentContract.run_id || 'n/a'}`,
    `Attachments: ${contentContract.attachments.join(', ') || 'none'}`,
    '',
    signature.text,
  ].join('\n')
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif; color:#0f172a; line-height:1.5; font-size:14px; max-width:760px;">
    <div style="background:#0f172a; color:#fff; padding:20px 24px; border-radius:14px 14px 0 0;">
      <div style="font-size:12px; letter-spacing:.12em; text-transform:uppercase; opacity:.8;">${contentContract.sender} Report</div>
      <div style="font-size:22px; font-weight:700; margin-top:6px;">${contentContract.report_type} — ${contentContract.system_or_project}</div>
    </div>
    <div style="border:1px solid #e2e8f0; border-top:none; border-radius:0 0 14px 14px; padding:24px; background:#ffffff;">
      <div style="margin-bottom:16px;"><strong>Current status:</strong> ${contentContract.current_status}</div>
      <div style="margin-bottom:16px;">
        <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px;">Key findings</div>
        <ul style="margin:0 0 0 18px; color:#334155;">${contentContract.key_findings.map((fact) => `<li>${fact}</li>`).join('')}</ul>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px;">Blockers or risks</div>
        <ul style="margin:0 0 0 18px; color:#334155;">${contentContract.blockers_or_risks.map((fact) => `<li>${fact}</li>`).join('')}</ul>
      </div>
      <div style="margin-bottom:16px;"><strong>Next action:</strong> ${contentContract.next_action.replace(/^Next action:\s*/i, '')}</div>
      <div style="margin-bottom:10px; color:#475569;"><strong>Evidence summary:</strong> ${contentContract.evidence_summary}</div>
      <div style="margin-bottom:10px; color:#475569;"><strong>Run ID:</strong> ${contentContract.run_id || 'n/a'}</div>
      <div style="margin-bottom:10px; color:#475569;"><strong>Attachments:</strong> ${contentContract.attachments.join(', ') || 'none'}</div>
      ${signature.html}
    </div>
  </div>`
  return { text, html, signature, contentContract }
}

function cleanBodyText(text) {
  if (/(Bug|Fix|Pipeline|Validation|Error)/i.test(text)) {
    throw new Error('[email_packager] Refusing to send debug text in email body')
  }
  return text
}

export function buildEmailPackage({ candidate, scorecard, reportFiles = [], attachmentManifest = {}, run = {}, mode = 'daily', reportIntelligence = null }) {
  const subjectPrefix = run.subjectPrefix || '[Dana]'
  const ticker = candidate?.ticker || 'Executive Summary'
  const subject = mode === 'weekly'
    ? `${subjectPrefix} Weekly Investment Rollup — ${ticker} — Ready for Review`
    : mode === 'daily-small-cap'
      ? `${subjectPrefix} Daily Small-Cap Brief — ${ticker} — Candidate Ready`
      : `${subjectPrefix} Executive Brief — ${ticker} — Candidate Ready`
  const execDocxPath = reportFiles.find((file) => file.endsWith('INV_Executive_Summary.docx')) || null
  if (!execDocxPath || !fs.existsSync(execDocxPath)) {
    console.warn('[email_packager] Report artifacts not found — skipping email packaging')
    return null
  }
  const body = buildExecutiveBody({ candidate, scorecard, run, mode, reportFiles, reportIntelligence })
  const text = cleanBodyText(body.text)
  const html = body.html
  const attachments = reportFiles.filter((file) => file.endsWith('.docx'))
  return {
    subject,
    body: text,
    text,
    html,
    signature: body.signature,
    attachments,
    fromName: body.signature.senderName,
    fromTitle: body.signature.senderTitle,
    metadata: {
      mode,
      runId: run.id || null,
      runDir: run.runDir || null,
      createdAt: new Date().toISOString(),
      candidate: candidate ? { ticker: candidate.ticker, companyName: candidate.companyName, score: scorecard?.weightedScore || null } : null,
      reportFiles,
      archivePath: attachmentManifest.archivePath || null,
      reportIntelligence: reportIntelligence ? { primaryTicker: reportIntelligence.primary_ticker || null } : null,
      canonicalReportPackRoot: reportPackRoot,
      templatePackIdentifier: 'dana-finance-report-pack',
      bodySource: 'report_intelligence',
      senderIdentity: body.signature.senderName,
      authorizedByMissionControl: true,
      contentContract: body.contentContract,
    },
  }
}
