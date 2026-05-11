import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDanaConfig } from '../config/index.js'
import { danaLogsRoot } from '../config/paths.js'
import { ensureDanaRuntime, ensureDir, pathForRun, runId, writeJson, appendJsonl } from '../agents/research/utils.js'
import { runMarketPipeline } from '../pipelines/market_pipeline.js'
import { runDailySmallCapPipeline } from '../agents/research/daily_small_cap_pipeline.js'
import { selectTopCandidates } from '../pipelines/candidate_pipeline.js'
import { runReportPipeline } from '../pipelines/report_pipeline.js'
import { buildAttachmentPackage } from '../email/attachment_builder.js'
import { buildEmailPackage } from '../email/email_packager.js'
import { sendEmailPayload } from '../email/delivery_adapter.js'
import { generateReportIntelligence } from '../agents/research/report_intelligence.js'
import { ensureGovernanceStores, logModelChange, logSimulationAssumption, createWeeklyOperatingArtifact, createBlockerVisibilityArtifact } from '../governance/runtime_governance.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function runStamp(mode) {
  return { id: runId(`dana_${mode}`), mode, startedAt: new Date().toISOString(), analysisDate: new Date().toISOString().slice(0, 10) }
}

function persistResearchArtifacts({ run, mode, market, shortlist = [], primary = null }) {
  const runDir = pathForRun(run.id)
  const researchDir = ensureDir(path.join(runDir, 'research'))
  const files = {
    scan: path.join(researchDir, 'market_scan.json'),
    normalized: path.join(researchDir, 'normalized_candidates.json'),
    ingested: path.join(researchDir, 'ingested_candidates.json'),
    scored: path.join(researchDir, 'scored_candidates.json'),
    shortlist: path.join(researchDir, 'shortlist.json'),
    primary: path.join(researchDir, 'primary_candidate.json'),
    reportReady: path.join(researchDir, 'report_ready.json'),
    manifest: path.join(researchDir, 'research_manifest.json'),
  }

  writeJson(files.scan, market.scan || {})
  writeJson(files.normalized, market.normalizedCandidates || [])
  writeJson(files.ingested, market.ingestedCandidates || [])
  writeJson(files.scored, market.scoredCandidates || market.candidates || [])
  writeJson(files.shortlist, shortlist)
  writeJson(files.primary, primary || {})
  writeJson(files.reportReady, {
    id: run.id,
    mode,
    analysisDate: run.analysisDate,
    shortlistCount: shortlist.length,
    primaryTicker: primary?.ticker || null,
    candidates: shortlist.map((candidate) => ({
      ticker: candidate.ticker,
      companyName: candidate.companyName,
      score: candidate.scorecard?.weightedScore ?? null,
      finalRankScore: candidate.scorecard?.finalRankScore ?? null,
      recommendation: candidate.scorecard?.recommendation ?? null,
      rating: candidate.scorecard?.finalRating ?? null,
    })),
  })
  writeJson(files.manifest, {
    id: run.id,
    mode,
    createdAt: new Date().toISOString(),
    files,
    marketNotes: market.scan?.notes || [],
    scanCount: market.scan?.candidates?.length || 0,
    shortlistCount: shortlist.length,
    primaryTicker: primary?.ticker || null,
  })
  return { researchDir, files }
}

function bootstrapGovernanceArtifacts(run) {
  const stores = ensureGovernanceStores()
  logModelChange({
    prior_model_version: 'pre-04.19.26-v11.3-governance',
    new_model_version: '04.19.26-v11.3-governance-active',
    change_summary: 'Activated mandatory model-change logging and governance hardening for Dana operational proof.',
    reason: 'Production hardening requirement before any future model tightening.',
    evidence_basis: ['04.19.26-v11.3 governance trail requirement'],
    scope: ['governance', 'model-change logging enforcement', 'send-path proof', 'weekly operating artifact'],
    changed_at: new Date().toISOString(),
    changed_by: 'Hermes',
  })
  logSimulationAssumption({
    setup_selected: 'simulation_not_started',
    structure_selected: 'not_applicable',
    alternate_structure_compared: 'not_applicable',
    assumptions: 'No simulation executed in this operational proof run; governance artifact created so future simulation runs require assumption logging first.',
    no_trade_cases: ['not_applicable_for_governance_bootstrap'],
    outcomes_logged: ['simulation_not_run'],
    fit_assessment: 'simulation_not_run_governance_only',
    run_id: run.id,
    created_at: new Date().toISOString(),
  })
  return stores
}

async function execute(mode = 'daily', options = {}) {
  ensureDanaRuntime()
  const cfg = getDanaConfig()
  const stampedRun = runStamp(mode)
  const run = {
    ...stampedRun,
    runDir: pathForRun(stampedRun.id),
    subjectPrefix: cfg.job?.emailSubjectPrefix || '[Dana]',
    to: cfg.job?.emailTo || ['SentinelsTechnologyGroup@gmail.com', 'Patrick@SentinelsDesignLab.com'],
    senderName: cfg.job?.owner || 'Dana',
    senderTitle: 'Chief Financial Officer',
    senderOrg: 'Mission Control',
  }
  const logPath = pathForRun(run.id, `${mode}.log.jsonl`)

  // ensure log dirs exist before first write
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  const sharedLogPath = path.join(danaLogsRoot, `${mode}.log`)

  const log = (level, message, extra = {}) => {
    const entry = { ts: new Date().toISOString(), level, message, runId: run.id, ...extra }
    const line = JSON.stringify(entry)
    console.log(`[Dana][${level}] ${message}`)
    appendJsonl(logPath, entry)
    fs.appendFileSync(sharedLogPath, `${line}\n`)
  }

  const governanceStores = bootstrapGovernanceArtifacts(run)

  let finished = null
  try {
    log('info', `Dana ${mode} job started`)

    const offline = options.offline ?? cfg.scan.offline
    if (mode === 'daily-small-cap') {
      log('info', 'Daily small-cap mode: running discovery + finalist report pipeline')
      const dailyResult = await runDailySmallCapPipeline({ offline, run })
      const primary = dailyResult.primary || null
      const reportIntelligence = dailyResult.reportIntelligence || generateReportIntelligence({ run, mode, candidates: dailyResult.finalists || [], primary })
      const researchArtifacts = persistResearchArtifacts({ run, mode, market: dailyResult.market, shortlist: dailyResult.finalists, primary })
      const reportArtifacts = {
        runDir: dailyResult.runDir,
        reportDir: dailyResult.dailyDir,
        attachmentDir: dailyResult.dailyDir,
        reportFiles: dailyResult.reportFiles,
        allReportFiles: dailyResult.allReportFiles,
        validation: dailyResult.validation,
        bundleArtifacts: dailyResult.bundleArtifacts,
        watchlistPath: dailyResult.watchlistPath,
        dailyDir: dailyResult.dailyDir,
      }
      const emailPayload = primary && dailyResult.primarySummaryDocx
        ? buildEmailPackage({ candidate: primary, scorecard: primary.scorecard, reportFiles: [dailyResult.primarySummaryDocx], run, mode, reportIntelligence: reportIntelligence.artifact })
        : null
      let sendResult = { ok: false, skipped: true }
      if (emailPayload) {
        sendResult = sendEmailPayload(emailPayload, { send: options.send === true, to: run.to })
      } else {
        log('warn', 'Email payload is null — email send skipped')
      }
      finished = {
        run,
        mode,
        marketNotes: dailyResult.market?.scan?.notes || [],
        candidatesScanned: dailyResult.market?.scan?.candidates?.length || 0,
        selectedCount: dailyResult.finalists?.length || 0,
        primary: primary ? { ticker: primary.ticker, companyName: primary.companyName, score: primary.scorecard?.weightedScore || null, rating: primary.scorecard?.finalRating || null } : null,
        opportunities: dailyResult.opportunities || [],
        researchArtifacts,
        reportArtifacts,
        emailPayload,
        sendResult,
        watchlistPath: dailyResult.watchlistPath,
        verificationPath: dailyResult.verificationPath || dailyResult.market?.verificationPath || null,
        reportIntelligencePath: reportIntelligence.artifactPath,
        watchlist: dailyResult.watchlist,
        secondaryVerification: dailyResult.secondary,
      }
      log('info', `Dana ${mode} job finished`, { selected: finished.selectedCount, sent: finished.sendResult?.ok ?? false })
      writeJson(pathForRun(run.id, 'run.json'), finished)
      return finished
    }

    let market = { scan: { notes: ['offline'] }, candidates: [], normalizedCandidates: [], ingestedCandidates: [], scoredCandidates: [] }
    if (!offline) {
      log('info', 'Running market pipeline')
      market = await runMarketPipeline({ offline: false, runId: run.id })
    }
    const candidates = market.scoredCandidates || market.candidates || []
    log('info', `Market scan complete`, { candidateCount: candidates.length })

    const selected = selectTopCandidates(candidates, 5)
    const primary = selected[0] || null
    log('info', `Candidate selection complete`, { selectedCount: selected.length, primary: primary?.ticker || null })

    const researchArtifacts = persistResearchArtifacts({ run, mode, market, shortlist: selected, primary })
    const reportIntelligence = generateReportIntelligence({ run, mode, candidates: selected, primary })

    let reportArtifacts = null
    let attachmentManifest = {}
    let emailPayload = null
    let sendResult = { ok: false, skipped: true }
    let weeklyOperatingArtifact = null
    let blockerVisibilityArtifact = null

    if (mode === 'daily') {
      // daily: research + scoring + candidate outputs only — skip reports and email
      log('info', 'Daily mode: skipping report generation and email packaging')
      const runDir = pathForRun(run.id)
      fs.mkdirSync(runDir, { recursive: true })
      writeJson(path.join(runDir, 'manifest.json'), { id: run.id, mode, startedAt: run.startedAt, status: primary ? 'candidate-ready' : 'no-candidates' })
      reportArtifacts = { runDir, reportDir: runDir, attachmentDir: path.join(runDir, 'attachments'), reportFiles: [], validation: { ok: true, stdout: '', stderr: '' }, manifest: { id: run.id, mode, status: 'daily-no-reports' } }
    } else {
      // weekly: full pipeline
      log('info', 'Weekly mode: running full report + email pipeline')
      if (primary) {
        log('info', `Building reports for ${primary.ticker}`)
        reportArtifacts = runReportPipeline({ run, candidate: primary, scorecard: primary.scorecard, mode, candidates: selected, reportIntelligence: reportIntelligence.artifact })
      } else {
        const runDir = pathForRun(run.id)
        fs.mkdirSync(runDir, { recursive: true })
        writeJson(path.join(runDir, 'manifest.json'), { id: run.id, mode, startedAt: run.startedAt, status: 'no-candidates' })
        reportArtifacts = { runDir, reportDir: runDir, attachmentDir: path.join(runDir, 'attachments'), reportFiles: [], validation: { ok: false, stdout: '', stderr: 'no candidates' }, manifest: { id: run.id, mode, status: 'no-candidates' } }
      }

      attachmentManifest = buildAttachmentPackage({ runDir: reportArtifacts.runDir, reportFiles: reportArtifacts.reportFiles, mode })
      emailPayload = buildEmailPackage({ candidate: primary, scorecard: primary?.scorecard, reportFiles: reportArtifacts.reportFiles, attachmentManifest, run, mode, reportIntelligence: reportIntelligence.artifact })

      if (emailPayload) {
        sendResult = sendEmailPayload(emailPayload, { send: options.send === true, to: run.to })
      } else {
        log('warn', 'Email payload is null — email send skipped')
      }
      weeklyOperatingArtifact = createWeeklyOperatingArtifact({
        run: { ...run, mode },
        verificationRecords: market.verificationRecords || [],
        selected,
        sendResult,
        reportArtifacts,
      })
      blockerVisibilityArtifact = createBlockerVisibilityArtifact({ run: { ...run, mode }, verificationRecords: market.verificationRecords || [] })
    }

    finished = {
      run,
      mode,
      marketNotes: market.scan?.notes || [],
      candidatesScanned: market.scan?.candidates?.length || 0,
      selectedCount: selected.length,
      verificationPath: market.verificationPath || null,
      reportIntelligencePath: reportIntelligence.artifactPath,
      primary: primary ? { ticker: primary.ticker, companyName: primary.companyName, score: primary.scorecard?.weightedScore || null, rating: primary.scorecard?.finalRating || null } : null,
      researchArtifacts,
      reportArtifacts: {
        runDir: reportArtifacts.runDir,
        reportFiles: reportArtifacts.reportFiles,
        validation: reportArtifacts.validation,
        attachmentManifest,
        reportPackEnforcement: reportArtifacts.reportPackEnforcement || null,
      },
      emailPayload,
      sendResult,
      weeklyOperatingArtifact,
      blockerVisibilityArtifact,
      governanceStores,
    }

    log('info', `Dana ${mode} job finished`, { selected: finished.selectedCount, sent: finished.sendResult?.ok ?? false })
    writeJson(pathForRun(run.id, 'run.json'), finished)
  } finally {
    if (!finished) {
      log('error', `Dana ${mode} job failed — partial log written`)
    }
  }

  return finished
}

export async function runDailySmallCapResearch(options = {}) {
  return execute('daily-small-cap', options)
}

export async function runDailyResearch(options = {}) {
  return execute('daily', options)
}

export async function runWeeklyResearch(options = {}) {
  return execute('weekly', options)
}

async function main() {
  const args = process.argv.slice(2)
  const mode = args[0] === 'weekly' ? 'weekly' : args[0] === 'daily-small-cap' ? 'daily-small-cap' : 'daily'
  const offline = args.includes('--offline')
  const send = args.includes('--send')
  const result = mode === 'weekly' ? await runWeeklyResearch({ offline, send }) : mode === 'daily-small-cap' ? await runDailySmallCapResearch({ offline, send }) : await runDailyResearch({ offline, send })
  console.log(JSON.stringify({
    ok: true,
    mode,
    runId: result.run.id,
    selectedCount: result.selectedCount,
    primary: result.primary,
    validationOk: result.reportArtifacts.validation?.ok ?? false,
    emailSent: result.sendResult.ok,
    runDir: result.reportArtifacts.runDir,
  }, null, 2))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
