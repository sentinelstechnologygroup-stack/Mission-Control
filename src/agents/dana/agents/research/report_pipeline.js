import fs from 'fs'
import path from 'path'
import { reportPackRoot } from '../../config/paths.js'
import { buildScorecard } from '../../reports/build_scorecard.js'
import { buildOpportunityAnalysis } from '../../reports/build_opportunity_analysis.js'
import { buildScenarioAnalysis } from '../../reports/build_scenario_analysis.js'
import { buildCapitalDeployment } from '../../reports/build_capital_deployment.js'
import { buildExecutiveSummary } from '../../reports/build_executive_summary.js'
import { buildPricingMarginModel } from '../../reports/build_pricing_margin_model.js'
import { buildRollup } from '../../reports/build_rollup.js'
import { validateReportFiles } from '../../reports/validator.js'
import { renderDanaDocxReport } from '../../reports/docx_renderer.js'
import { ensureDanaRuntime, ensureDir, pathForRun, runId, writeText, writeJson, safeFilename } from './utils.js'
import { createReportContext } from './schemas.js'
import { enforceCanonicalReportPack } from '../../governance/runtime_governance.js'

function normalizeReportCandidate(candidate = {}) {
  return {
    ...candidate,
    companyName: candidate?.companyName || candidate?.ticker || 'Unknown Company',
    sector: candidate?.sector || candidate?.industry || candidate?.overview?.sector || 'Unknown Sector',
    revenueModel: candidate?.revenueModel || candidate?.businessModel || 'Recurring operating revenue supported by disclosed company financials',
    businessModel: candidate?.businessModel || candidate?.revenueModel || 'Public operating company',
  }
}

function copyPackList(reportDir, docs) {
  const outputs = []
  for (const doc of docs) {
    const filePath = path.join(reportDir, doc.name)
    writeText(filePath, doc.content)
    outputs.push(filePath)
  }
  return outputs
}

function buildDocxScenarios(candidate, scorecard, analysisDate) {
  const price = Number(candidate?.price) || 0
  const score = Number(scorecard?.weightedScore || 5)
  const stop = price ? Number((price * 0.85).toFixed(2)) : null
  const entry = price ? Number((price * 1.02).toFixed(2)) : null
  const capitalAtRisk = price ? Number((price * 0.15).toFixed(2)) : null
  const target = price ? Number((price * (1 + Math.max(0.12, score * 0.08))).toFixed(2)) : null
  return {
    analysisDate,
    currentPrice: price || null,
    entryPrice: entry,
    capitalAtRisk,
    timeHorizon: '3-6 months',
    stopLoss: stop,
    matrix: {
      bear: { probability: '20%', growth: '-20%', multiple: '10.0x', eps: '$1.00', target: price ? Number((price * 0.85).toFixed(2)).toFixed(2) : '—' },
      base: { probability: '50%', growth: '20%', multiple: '12.0x', eps: '$1.20', target: target ? target.toFixed(2) : '—' },
      bull: { probability: '30%', growth: '35%', multiple: '15.0x', eps: '$1.50', target: target ? Number((target * 1.18).toFixed(2)).toFixed(2) : '—' },
    },
    tableRows: [
      ['Probability', '20%', '50%', '30%'],
      ['Growth', '-20%', '20%', '35%'],
      ['Multiple', '10.0x', '12.0x', '15.0x'],
      ['EPS', '$1.00', '$1.20', '$1.50'],
      ['Target', price ? Number((price * 0.85).toFixed(2)).toFixed(2) : '—', target ? target.toFixed(2) : '—', target ? Number((target * 1.18).toFixed(2)).toFixed(2) : '—'],
    ],
    expectedValue: {
      weightedReturn: '—',
      weightedDollar: '—',
      upsideScenario: candidate?.catalystNewsPresence ? 'Bullish catalyst + liquidity' : 'No catalyst yet',
      downsideScenario: 'Loss of volume or negative news',
    },
    position: {
      stop: stop ? stop.toFixed(2) : '—',
      add: price ? (price * 1.10).toFixed(2) : '—',
      trim: price ? (price * 1.25).toFixed(2) : '—',
      review: 'Reassess after catalyst window',
    },
    decision: {
      action: score >= 5.5 ? 'Favorable' : 'Unfavorable',
      riskReward: price ? '1:1.5' : '—',
    },
  }
}

function buildDocxCapitalPlan(candidate, scorecard, analysisDate) {
  const price = Number(candidate?.price) || 0
  const score = Number(scorecard?.weightedScore || 5)
  const target = price ? Number((price * (1 + Math.max(0.12, score * 0.08))).toFixed(2)) : null
  const stop = price ? Number((price * 0.85).toFixed(2)) : null
  const size = Math.max(0.5, Math.min(3.0, score * 0.3))
  const shares = price ? Math.floor(((size / 100) * 100000) / price) : 0
  return {
    analysisDate,
    header: {
      ticker: candidate?.ticker || '—',
      company: candidate?.companyName || '—',
      sector: candidate?.sector || '—',
      price: price ? price.toFixed(2) : '—',
    },
    summary: {
      title: `${candidate?.ticker || '—'} — ${candidate?.companyName || 'Company Name'}`,
      score: `${score.toFixed(1)} / 10 — ${score >= 8.5 ? 'Strong Buy' : score >= 7 ? 'Buy' : score >= 5.5 ? 'Watch' : 'Pass'}`,
      target: target ? target.toFixed(2) : '—',
      riskReward: target && stop && price ? `1:${((target - price) / Math.max(0.01, price - stop)).toFixed(1)}` : '—',
      horizon: 'Short-term <1yr / Medium 1–3yr / Long-term 3yr+',
      conviction: score >= 7 ? 'High' : score >= 5.5 ? 'Medium' : 'Low',
    },
    portfolio: {
      capital: '$100,000',
      starterBudget: '$10,000 (10%)',
      openPositions: '10 open positions',
      sectorExposure: 'Sector exposure balanced',
      correlationCap: '20%',
      singleNameCap: '5%',
    },
    sizing: {
      starterSize: `${size.toFixed(1)}%  →  $${Math.round(size / 100 * 100000).toLocaleString()}`,
      starterEntry: price ? `$${(price * 1.15).toFixed(2)}  (15% of portfolio)` : '—',
      shares: price ? `${shares} shares @ ${price.toFixed(2)}` : '—',
      kelly: `${(size / 2).toFixed(1)}% (full Kelly) → ${(size / 4).toFixed(1)}% (half Kelly)`,
    },
    staged: {
      current: 'Current price / immediate entry',
      pullback: price ? `Pullback to $${(price * 0.95).toFixed(2)}` : '—',
      catalyst: 'Catalyst confirmation',
      maxSize: `${size.toFixed(1)}% of portfolio at full size`,
    },
    rules: {
      stop: price && stop ? `${stop.toFixed(2)}  (${((price - stop) / price * 100).toFixed(1)}% below entry) — hard stop, no exceptions` : '—',
      trim: target ? `Trim 50% at ${target.toFixed(2)} (base target) to lock in gains` : '—',
      bull: target ? `$${(target * 1.15).toFixed(2)} bull target hit, or thesis broken` : '—',
      review: 'Re-evaluate at each earnings report and major news events',
      reenter: 'Re-enter if catalyst intact and setup resets',
      reassess: '6 months — reassess full position if still holding',
    },
    decision: {
      action: price ? `Deploy — ${size.toFixed(1)}% of portfolio — $${Math.round(size / 100 * 100000).toLocaleString()} initial deployment` : 'Hold',
      rationale: 'Why now: score and setup support a starter position.',
    },
  }
}

export function buildCandidatePack(candidate, scorecard, options = {}) {
  const analysisDate = options.analysisDate || new Date().toISOString().slice(0, 10)
  const reportCandidate = normalizeReportCandidate(candidate)
  const ctx = createReportContext({ candidate: reportCandidate, scorecard, analysis: null, scenario: null, capital: null, executive: null, pricing: null, run: options.run || null })
  const docs = [
    { name: 'INV_Opportunity_Scorecard.md', content: buildScorecard(reportCandidate, scorecard, { analysisDate }) },
    { name: 'INV_Stock_Opportunity_Analysis.md', content: buildOpportunityAnalysis(reportCandidate, scorecard, { analysisDate }) },
    { name: 'INV_Scenario_Analysis.md', content: buildScenarioAnalysis(reportCandidate, scorecard, { analysisDate }) },
    { name: 'INV_Pricing_Margin_Model.md', content: buildPricingMarginModel(reportCandidate, scorecard, { analysisDate }) },
    { name: 'INV_Capital_Deployment.md', content: buildCapitalDeployment(reportCandidate, scorecard, { analysisDate }) },
    { name: 'INV_Executive_Summary.md', content: buildExecutiveSummary(reportCandidate, scorecard, { analysisDate }) },
  ]
  return { ctx, docs }
}

export function buildWeeklyRollupPack(candidates, options = {}) {
  const analysisDate = options.analysisDate || new Date().toISOString().slice(0, 10)
  const reportCandidates = candidates.map(normalizeReportCandidate)
  const primaryCandidate = normalizeReportCandidate(options.primaryCandidate || candidates[0] || {})
  const scorecard = options.scorecard || primaryCandidate.scorecard || null
  const docs = [
    { name: 'INV_Rollup.md', content: buildRollup(reportCandidates, { analysisDate }) },
  ]
  if (primaryCandidate?.ticker) {
    docs.push(
      { name: 'INV_Opportunity_Scorecard.md', content: buildScorecard(primaryCandidate, scorecard, { analysisDate }) },
      { name: 'INV_Executive_Summary.md', content: buildExecutiveSummary(primaryCandidate, scorecard, { analysisDate }) },
    )
  }
  return { docs }
}

export function generateCandidateReportBundleArtifacts({ run, candidate, scorecard, bundleName = null }) {
  ensureDanaRuntime()
  const reportRunId = run?.id || runId('dana_run')
  const bundleId = safeFilename(bundleName || candidate?.ticker || 'finalist')
  const runDir = pathForRun(reportRunId)
  const bundleDir = ensureDir(path.join(runDir, 'finalists', bundleId))
  const reportDir = ensureDir(path.join(bundleDir, 'reports'))
  const attachmentDir = ensureDir(path.join(bundleDir, 'attachments'))
  const reportCandidate = normalizeReportCandidate(candidate)
  const docs = buildCandidatePack(reportCandidate, scorecard, { analysisDate: run?.analysisDate, run }).docs
  const markdownFiles = copyPackList(reportDir, docs)
  const contextPath = path.join(bundleDir, 'report_context.json')
  const analysisDate = run?.analysisDate || new Date().toISOString().slice(0, 10)
  const docContext = {
    id: `${reportRunId}:${bundleId}`,
    mode: 'daily-finalist',
    run,
    candidate: reportCandidate,
    scorecard,
    analysisDate,
  }
  writeJson(contextPath, docContext)

  const docxFiles = []
  for (const markdownPath of markdownFiles) {
    const markdownName = path.basename(markdownPath)
    const outputPath = path.join(reportDir, markdownName.replace(/\.md$/i, '.docx'))
    const rendered = renderDanaDocxReport({ markdownPath, outputPath, contextPath, markdownName })
    if (rendered) docxFiles.push(rendered)
  }

  const validation = validateReportFiles(markdownFiles)
  const manifest = {
    id: `${reportRunId}:${bundleId}`,
    mode: 'daily-finalist',
    bundleId,
    createdAt: new Date().toISOString(),
    reportDir,
    attachmentDir,
    reportFiles: docxFiles,
    markdownFiles,
    docxFiles,
    validation,
  }
  writeJson(path.join(bundleDir, 'manifest.json'), manifest)
  return { runDir: bundleDir, reportDir, attachmentDir, reportFiles: docxFiles, markdownFiles, docxFiles, docs, validation, manifest }
}

export function generateReportRunArtifacts({ run, candidate, scorecard, mode = 'daily', candidates = [], reportIntelligence = null }) {
  ensureDanaRuntime()
  const reportRunId = run?.id || runId('dana_run')
  const runDir = pathForRun(reportRunId)
  const reportDir = path.join(runDir, 'reports')
  const attachmentDir = path.join(runDir, 'attachments')
  ensureDir(reportDir)
  ensureDir(attachmentDir)

  const reportCandidate = normalizeReportCandidate(candidate)
  const reportCandidates = candidates.map(normalizeReportCandidate)
  const docs = mode === 'weekly' ? buildWeeklyRollupPack(reportCandidates, { analysisDate: run?.analysisDate, run, primaryCandidate: reportCandidate, scorecard }).docs : buildCandidatePack(reportCandidate, scorecard, { analysisDate: run?.analysisDate, run }).docs
  const markdownFiles = copyPackList(reportDir, docs)
  const contextPath = path.join(runDir, 'report_context.json')
  const analysisDate = run?.analysisDate || new Date().toISOString().slice(0, 10)
  const docContext = {
    id: reportRunId,
    mode,
    run,
    candidate: reportCandidate,
    scorecard,
    candidates: reportCandidates,
    reportIntelligence,
    scenarios: buildDocxScenarios(reportCandidate, scorecard, analysisDate),
    capitalPlan: buildDocxCapitalPlan(reportCandidate, scorecard, analysisDate),
    analysisDate,
  }
  writeJson(contextPath, docContext)

  const docxFiles = []
  for (const markdownPath of markdownFiles) {
    const markdownName = path.basename(markdownPath)
    const outputPath = path.join(reportDir, markdownName.replace(/\.md$/i, '.docx'))
    const rendered = renderDanaDocxReport({ markdownPath, outputPath, contextPath, markdownName })
    if (rendered) docxFiles.push(rendered)
  }

  const reportFiles = docxFiles.length ? docxFiles : markdownFiles
  const validation = mode === 'weekly'
    ? validateReportFiles(markdownFiles.filter((file) => file.endsWith('INV_Rollup.md')))
    : validateReportFiles(markdownFiles)
  const reportPackEnforcement = enforceCanonicalReportPack({ run, mode, markdownFiles, docxFiles, validation })

  const manifest = {
    id: reportRunId,
    mode,
    createdAt: new Date().toISOString(),
    reportPackRoot,
    reportPackEnforcementPath: reportPackEnforcement.artifactPath,
    reportDir,
    attachmentDir,
    reportFiles,
    markdownFiles,
    docxFiles,
    validation,
  }
  writeJson(path.join(runDir, 'manifest.json'), manifest)
  return { runDir, reportDir, attachmentDir, reportFiles, markdownFiles, docxFiles, docs, validation, manifest, reportPackEnforcement }
}
