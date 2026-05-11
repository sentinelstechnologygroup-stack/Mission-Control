import fs from 'fs'
import path from 'path'
import { getDanaConfig } from '../../config/index.js'
import { pathForRun, ensureDir, writeJson, money, round, nowIso, safeFilename } from './utils.js'
import { runMarketPipeline } from '../../pipelines/market_pipeline.js'
import { generateCandidateReportBundleArtifacts } from './report_pipeline.js'
import { generateReportIntelligence } from './report_intelligence.js'

const WATCHLIST_PATH = path.join('/home/patrick/mission-control/runtime/dana', 'watchlists', 'small_cap_watchlist.json')
const HISTORY_PATH = path.join('/home/patrick/mission-control/runtime/dana', 'watchlists', 'small_cap_history.json')

function upper(value) {
  return String(value ?? '').trim().toUpperCase()
}

function loadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const text = fs.readFileSync(filePath, 'utf8').trim()
    if (!text) return fallback
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function saveJson(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
  return filePath
}

function loadHistory() {
  return loadJson(HISTORY_PATH, { updatedAt: null, runs: [], tickers: {} })
}

function buildSupportSignals(candidate) {
  const support = []
  const volumeAligned = (Number(candidate.relativeVolume || 0) >= 1.5) || (Number(candidate.averageVolume || 0) >= 500000)
  const momentumAligned = Math.abs(Number(candidate.dailyMovePct || 0)) >= 4 || Number(candidate.marketMomentumPct || 0) > 0 || Number(candidate.longMomentumPct || 0) > 0
  if (volumeAligned) support.push('volume')
  if (momentumAligned) support.push('momentum')
  if (candidate.catalystNewsPresence || (candidate.news || []).length) support.push('news')
  if (Number(candidate.annualRevenue || 0) >= 50_000_000) support.push('revenue')
  if (Number(candidate.cashFlow || 0) > 0) support.push('cash-flow')
  if (Number(candidate.netIncome || 0) > 0) support.push('earnings')
  return { support: [...new Set(support)], volumeAligned, momentumAligned }
}

function buildPrecisionGate(candidate, cfg) {
  const validation = cfg.validation || {}
  const signalScore = Number(candidate.scorecard?.signalScore ?? candidate.scorecard?.weightedScore ?? candidate.scorecard?.finalRankScore ?? 0)
  const finalScore = Number(candidate.scorecard?.finalScore ?? candidate.scorecard?.finalRankScore ?? 0)
  const dataConfidence = Number(candidate.data_confidence ?? candidate.dataConfidence ?? 0)
  const { support, volumeAligned, momentumAligned } = buildSupportSignals(candidate)
  const failedRules = []
  if (dataConfidence < (validation.minDataConfidence ?? 0.7)) failedRules.push(`confidence below ${(validation.minDataConfidence ?? 0.7).toFixed(2)}`)
  if (signalScore < (validation.minSignalScore ?? 5)) failedRules.push(`signal score below ${(validation.minSignalScore ?? 5).toFixed(2)}`)
  if ((validation.requireVolumeMomentumAlignment ?? true) && (!volumeAligned || !momentumAligned)) failedRules.push('volume and momentum not aligned')
  if (support.length < (validation.minSupportSignals ?? 2)) failedRules.push(`insufficient support signals (${support.length}/${validation.minSupportSignals ?? 2})`)
  if (support.length === 1) failedRules.push('single-factor signal')
  const passed = failedRules.length === 0
  const rejectionReason = passed ? '' : failedRules.join('; ')
  const passedReason = passed ? `signal score ${round(signalScore, 2)} with ${support.join(', ')} and confidence ${round(dataConfidence, 2)}` : ''
  return {
    passed,
    signalScore,
    finalScore,
    dataConfidence,
    failedRules,
    rejectionReason,
    passedReason,
    supportSignals: support,
    volumeAligned,
    momentumAligned,
    minDataConfidence: validation.minDataConfidence ?? 0.7,
    minSignalScore: validation.minSignalScore ?? 5,
    maxFinalCandidates: validation.maxFinalCandidates ?? 5,
  }
}

function buildSignalTrend(current, previous) {
  if (!previous) {
    return {
      repeatedAppearances: 1,
      trend: 'new',
      signalDelta: null,
      confidenceDelta: null,
      previousRunId: null,
      previousTimestamp: null,
    }
  }
  const signalDelta = round((current.precisionGate?.finalScore ?? 0) - (previous.finalScore ?? 0), 2)
  const confidenceDelta = round((current.precisionGate?.dataConfidence ?? 0) - (previous.dataConfidence ?? 0), 3)
  const trend = signalDelta > 0.15 && confidenceDelta >= 0 ? 'strengthening' : signalDelta < -0.15 || confidenceDelta < -0.05 ? 'weakening' : 'stable'
  return {
    repeatedAppearances: (previous.comparison?.repeatedAppearances ?? previous.repeatedAppearances ?? 1) + 1,
    trend,
    signalDelta,
    confidenceDelta,
    previousRunId: previous.runId || null,
    previousTimestamp: previous.timestamp || null,
  }
}

function buildWatchlist(items = []) {
  return items.slice(0, 10).map((candidate, index) => ({
    rank: index + 1,
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    price: candidate.price,
    score: candidate.scorecard?.finalRankScore ?? candidate.scorecard?.finalScore ?? candidate.dailyScore ?? null,
    decision: candidate.finalDecision,
    validationStatus: candidate.validation_status || candidate.validationStatus,
    sourceCount: candidate.source_count ?? candidate.sourceCount ?? 0,
    dataConfidence: round(candidate.data_confidence ?? candidate.dataConfidence ?? 0, 3),
    repeatedAppearances: candidate.comparison?.repeatedAppearances ?? 1,
    trend: candidate.comparison?.trend || 'new',
    lastUpdated: new Date().toISOString(),
  }))
}

function createSnapshot(candidate, run, status, comparison = null) {
  return {
    runId: run.id,
    analysisDate: run.analysisDate,
    timestamp: new Date().toISOString(),
    status,
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    price: candidate.price,
    score: round(candidate.scorecard?.finalRankScore ?? candidate.scorecard?.finalScore ?? candidate.dailyScore ?? 0, 2),
    finalScore: round(candidate.precisionGate?.finalScore ?? candidate.scorecard?.finalRankScore ?? candidate.scorecard?.finalScore ?? candidate.dailyScore ?? 0, 2),
    dataConfidence: round(candidate.precisionGate?.dataConfidence ?? candidate.data_confidence ?? candidate.dataConfidence ?? 0, 3),
    validationStatus: candidate.validation_status || candidate.validationStatus,
    sourceCount: candidate.source_count ?? candidate.sourceCount ?? 0,
    comparison,
  }
}

function persistWatchlist(watchlist) {
  saveJson(WATCHLIST_PATH, {
    updatedAt: new Date().toISOString(),
    count: watchlist.length,
    items: watchlist,
  })
  return WATCHLIST_PATH
}

function summarizeOpportunity(candidate) {
  return {
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    currentPrice: candidate.price,
    score: round(candidate.scorecard?.finalRankScore ?? candidate.scorecard?.finalScore ?? candidate.dailyScore ?? 0, 2),
    decision: candidate.finalDecision,
    entryGuidance: candidate.entryGuidance,
    stopLoss: candidate.stopLoss,
    target: candidate.targetPrice,
    riskReward: candidate.riskReward,
    thesis: candidate.thesis,
    confidenceLevel: candidate.confidenceLevel,
    sourceConfidence: candidate.sourceConfidenceNote,
    source_count: candidate.source_count ?? candidate.sourceCount,
    data_confidence: candidate.data_confidence ?? candidate.dataConfidence,
    missing_fields: candidate.missing_fields ?? candidate.missingFields,
    validation_status: candidate.validation_status || candidate.validationStatus,
    passed_reason: candidate.passedReason || candidate.precisionGate?.passedReason || '',
    comparison: candidate.comparison || null,
  }
}

function buildRejectionRecord(candidate) {
  return {
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    rejection_reason: candidate.rejectionReason || candidate.precisionGate?.rejectionReason || candidate.rejection_reasons?.join('; ') || candidate.rejectionReasons?.join('; ') || candidate.validation_notes?.join('; ') || candidate.validationNotes?.join('; ') || 'did not meet precision gate',
    failed_rules: candidate.failedRules || candidate.precisionGate?.failedRules || candidate.rejection_reasons || candidate.rejectionReasons || candidate.validation_notes || candidate.validationNotes || [],
    confidence: round(candidate.precisionGate?.dataConfidence ?? candidate.data_confidence ?? candidate.dataConfidence ?? 0, 3),
    signalScore: round(candidate.precisionGate?.signalScore ?? candidate.scorecard?.signalScore ?? candidate.scorecard?.weightedScore ?? 0, 2),
    finalScore: round(candidate.precisionGate?.finalScore ?? candidate.scorecard?.finalScore ?? candidate.scorecard?.finalRankScore ?? 0, 2),
    validation_status: candidate.validation_status || candidate.validationStatus,
    source_count: candidate.source_count ?? candidate.sourceCount ?? 0,
    data_confidence: round(candidate.data_confidence ?? candidate.dataConfidence ?? 0, 3),
    comparison: candidate.comparison || null,
    supportSignals: candidate.precisionGate?.supportSignals || [],
  }
}

function buildRunComparison(history, run) {
  const previousRun = history.runs.length ? history.runs[history.runs.length - 1] : null
  if (!previousRun) {
    return { previousRunId: null, previousAnalysisDate: null, repeatedFinalists: 0, strengthening: 0, weakening: 0 }
  }
  return {
    previousRunId: previousRun.runId || null,
    previousAnalysisDate: previousRun.analysisDate || null,
    repeatedFinalists: 0,
    strengthening: 0,
    weakening: 0,
  }
}

export async function runDailySmallCapPipeline(options = {}) {
  const cfg = getDanaConfig()
  const run = options.run || { id: options.runId || `dana_daily_small_cap_${Date.now().toString(36)}`, mode: 'daily-small-cap', startedAt: new Date().toISOString(), analysisDate: new Date().toISOString().slice(0, 10) }
  const runDir = pathForRun(run.id)
  const dailyDir = ensureDir(path.join(runDir, 'daily_small_cap'))
  ensureDir(dailyDir)

  const market = await runMarketPipeline({ offline: options.offline ?? cfg.scan.offline, runId: run.id })
  const scored = market.scoredCandidates || market.candidates || []
  const evaluated = scored.map((candidate) => ({
    ...candidate,
    finalDecision: candidate.finalDecision || candidate.scorecard?.recommendation || candidate.decision || 'PASS',
    precisionGate: buildPrecisionGate(candidate, cfg),
  }))
  const ordered = [...evaluated].sort((a, b) => (b.precisionGate?.finalScore ?? b.scorecard?.finalRankScore ?? 0) - (a.precisionGate?.finalScore ?? a.scorecard?.finalRankScore ?? 0))

  const history = loadHistory()
  const historyByTicker = history.tickers || {}

  const compared = ordered.map((candidate) => {
    const previous = historyByTicker[candidate.ticker]?.snapshots?.[historyByTicker[candidate.ticker].snapshots.length - 1] || null
    const comparison = buildSignalTrend(candidate, previous)
    return { ...candidate, comparison }
  })

  const watchlist = buildWatchlist(compared)
  const watchlistPath = persistWatchlist(watchlist)

  const precisionPassed = compared.filter((candidate) => candidate.precisionGate?.passed && candidate.validation_status === 'approved' && candidate.finalDecision === 'BUY')
  const finalists = precisionPassed.slice(0, cfg.validation?.maxFinalCandidates ?? 5)
  const primary = finalists[0] || null
  const reportIntelligence = generateReportIntelligence({ run, mode: 'daily-small-cap', candidates: finalists, primary })
  const rejectedCandidates = market.blockedCandidates || compared.filter((candidate) => !candidate.precisionGate?.passed || candidate.validation_status !== 'approved' || candidate.finalDecision !== 'BUY')
  const secondary = rejectedCandidates.slice(0, 5)

  const bundleArtifacts = []
  for (const finalist of finalists) {
    const reportCandidate = {
      ...finalist,
      passedReason: finalist.precisionGate?.passedReason || '',
      comparisonSummary: finalist.comparison,
      topRejectSummary: rejectedCandidates.slice(0, 3).map((item) => `${item.ticker}: ${item.rejectionReason || item.precisionGate?.rejectionReason || 'did not meet precision gate'}`),
    }
    const bundle = await generateCandidateReportBundleArtifacts({ run, candidate: reportCandidate, scorecard: finalist.scorecard, bundleName: finalist.ticker })
    bundleArtifacts.push({
      ticker: finalist.ticker,
      runDir: bundle.runDir,
      reportDir: bundle.reportDir,
      reportFiles: bundle.reportFiles,
      validation: bundle.validation,
      manifest: bundle.manifest,
    })
  }

  const primaryBundle = bundleArtifacts[0] || null
  const primarySummaryDocx = primaryBundle?.reportFiles?.find((file) => path.basename(file) === 'INV_Executive_Summary.docx') || null
  const opportunities = finalists.map(summarizeOpportunity)
  const rejectionAnalysis = rejectedCandidates.map(buildRejectionRecord)

  const runComparison = buildRunComparison(history, run)
  const comparator = {
    previousRunId: runComparison.previousRunId,
    previousAnalysisDate: runComparison.previousAnalysisDate,
    repeatedFinalists: finalists.filter((candidate) => historyByTicker[candidate.ticker]).length,
    strengthening: compared.filter((candidate) => candidate.comparison?.trend === 'strengthening').length,
    weakening: compared.filter((candidate) => candidate.comparison?.trend === 'weakening').length,
  }

  const reportReady = {
    id: run.id,
    mode: 'daily-small-cap',
    analysisDate: run.analysisDate,
    opportunities,
    rejected: rejectionAnalysis.slice(0, 10),
    secondaryVerification: secondary.map((candidate) => ({
      ticker: candidate.ticker,
      companyName: candidate.companyName,
      verificationStatus: candidate.verification_status || candidate.verificationStatus,
      rejectionReasons: candidate.rejection_reasons || candidate.rejectionReasons || [],
      confidenceScore: candidate.confidence_score ?? candidate.confidenceScore ?? null,
      sourceAgreement: candidate.source_agreement || candidate.sourceAgreement,
      criticalFieldCheck: candidate.critical_field_check || candidate.criticalFieldCheck,
      missing: candidate.missing_fields || candidate.missingFields,
      flags: candidate.validation_flags || candidate.validationFlags,
      notes: candidate.verificationNotes || candidate.validation_notes || candidate.validationNotes,
    })),
    watchlist: watchlist.slice(0, 10),
    comparison: comparator,
    primaryTicker: primary?.ticker || null,
    primaryDecision: primary?.finalDecision || 'PASS',
    primarySummary: primary ? summarizeOpportunity(primary) : null,
  }

  const dailyQualityBrief = {
    runId: run.id,
    analysisDate: run.analysisDate,
    finalists: opportunities.map((item) => ({
      ticker: item.ticker,
      whyPassed: item.passed_reason || item.passedReason || item.sourceConfidence,
      repeatedAppearances: item.comparison?.repeatedAppearances || 1,
      trend: item.comparison?.trend || 'new',
      signalDelta: item.comparison?.signalDelta ?? null,
      confidenceDelta: item.comparison?.confidenceDelta ?? null,
    })),
    topRejects: rejectionAnalysis.slice(0, 5),
    comparison: comparator,
  }

  saveJson(path.join(dailyDir, 'daily_report_ready.json'), reportReady)
  saveJson(path.join(dailyDir, 'daily_opportunities.json'), opportunities)
  saveJson(path.join(dailyDir, 'daily_rejections.json'), rejectionAnalysis)
  saveJson(path.join(dailyDir, 'daily_secondary_verification.json'), secondary.map((candidate) => ({
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    verificationStatus: candidate.verification_status || candidate.verificationStatus,
    rejectionReasons: candidate.rejection_reasons || candidate.rejectionReasons || [],
    confidenceScore: candidate.confidence_score ?? candidate.confidenceScore ?? null,
    sourceAgreement: candidate.source_agreement || candidate.sourceAgreement,
    criticalFieldCheck: candidate.critical_field_check || candidate.criticalFieldCheck,
    missing: candidate.missing_fields || candidate.missingFields,
    flags: candidate.validation_flags || candidate.validationFlags,
    notes: candidate.verificationNotes || candidate.validation_notes || candidate.validationNotes,
  })))
  saveJson(path.join(dailyDir, 'daily_watchlist.json'), { updatedAt: new Date().toISOString(), items: watchlist })
  saveJson(path.join(dailyDir, 'daily_quality_brief.json'), dailyQualityBrief)
  fs.writeFileSync(path.join(dailyDir, 'daily_quality_brief.md'), [
    `# Dana Daily Quality Brief`,
    `Run: ${run.id}`,
    `Date: ${run.analysisDate}`,
    '',
    `Finalists: ${opportunities.length}`,
    ...opportunities.map((item) => `- ${item.ticker}: ${item.passed_reason || item.sourceConfidence || 'passed precision gate'}`),
    '',
    `Top rejects:`,
    ...rejectionAnalysis.slice(0, 5).map((item) => `- ${item.ticker}: ${item.rejection_reason}`),
    '',
    `Comparison vs previous run:`,
    `- previous run: ${comparator.previousRunId || 'none'}`,
    `- repeated finalists: ${comparator.repeatedFinalists}`,
    `- strengthening names: ${comparator.strengthening}`,
    `- weakening names: ${comparator.weakening}`,
  ].join('\n'))

  history.updatedAt = new Date().toISOString()
  history.runs = [...(history.runs || []), {
    runId: run.id,
    analysisDate: run.analysisDate,
    createdAt: new Date().toISOString(),
    finalists: opportunities.map((item) => ({
      ticker: item.ticker,
      score: item.score,
      finalScore: item.comparison?.finalScore ?? null,
      dataConfidence: item.data_confidence ?? null,
    })),
    rejects: rejectionAnalysis.slice(0, 10),
  }].slice(-((cfg.validation?.historyLimit ?? 20) || 20))
  history.tickers = history.tickers || {}
  for (const candidate of compared) {
    const ticker = upper(candidate.ticker)
    if (!ticker) continue
    const prev = history.tickers[ticker] || { appearances: 0, snapshots: [] }
    const snapshot = createSnapshot(candidate, run, finalists.some((item) => item.ticker === candidate.ticker) ? 'finalist' : 'rejected', candidate.comparison)
    prev.appearances = (prev.appearances || 0) + 1
    prev.lastRunId = run.id
    prev.lastAnalysisDate = run.analysisDate
    prev.lastStatus = snapshot.status
    prev.snapshots = [...(prev.snapshots || []), snapshot].slice(-((cfg.validation?.snapshotLimit ?? 8) || 8))
    history.tickers[ticker] = prev
  }
  saveJson(HISTORY_PATH, history)

  const dailySummary = {
    id: run.id,
    mode: 'daily-small-cap',
    createdAt: new Date().toISOString(),
    candidatesScanned: scored.length,
    candidatesEvaluated: evaluated.length,
    validationSummary: market.verificationSummary,
    finalists: opportunities,
    rejected: rejectionAnalysis.slice(0, 10),
    comparison: comparator,
    watchlistPath,
    verificationPath: market.verificationPath || null,
    reportBundles: bundleArtifacts,
    primarySummaryDocx,
    primary,
    reportReadyPath: path.join(dailyDir, 'daily_report_ready.json'),
    dailyDir,
    allDocxFiles: bundleArtifacts.flatMap((bundle) => bundle.reportFiles || []),
    status: opportunities.length ? 'opportunities-found' : 'pass',
  }

  saveJson(path.join(dailyDir, 'daily_manifest.json'), dailySummary)

  return {
    run,
    runDir,
    dailyDir,
    market,
    evaluated: compared,
    ordered: compared,
    approved: precisionPassed,
    finalists,
    rejectedCandidates,
    secondary,
    watchlist,
    watchlistPath,
    verificationPath: market.verificationPath || null,
    reportReady,
    bundleArtifacts,
    reportIntelligence,
    primary,
    primarySummaryDocx,
    reportFiles: primarySummaryDocx ? [primarySummaryDocx] : [],
    allReportFiles: bundleArtifacts.flatMap((bundle) => bundle.reportFiles || []),
    validation: primaryBundle?.validation || { ok: finalists.length === 0, stdout: '', stderr: '' },
    manifest: dailySummary,
    opportunities,
    rejectionAnalysis,
    historyPath: HISTORY_PATH,
  }
}
