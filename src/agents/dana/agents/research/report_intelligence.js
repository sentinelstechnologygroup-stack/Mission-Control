import path from 'path'
import { ensureDir, pathForRun, round, writeJson } from './utils.js'

function safeNumber(value, fallback = null) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function recommendationFromScore(scorecard = {}) {
  return String(scorecard.recommendation || 'PASS').toUpperCase()
}

function strongestFactors(scorecard = {}, limit = 3) {
  return (scorecard.factorBreakdown || [])
    .filter((item) => Number.isFinite(item?.contribution))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, limit)
}

function strongestWeaknesses(scorecard = {}, limit = 2) {
  return (scorecard.factorBreakdown || [])
    .filter((item) => Number.isFinite(item?.rawScore))
    .sort((a, b) => a.rawScore - b.rawScore)
    .slice(0, limit)
}

function supportingFacts(candidate = {}, scorecard = {}) {
  const facts = []
  const push = (label, value) => {
    if (value === null || value === undefined || value === '' || value === '—') return
    facts.push(`${label}: ${value}`)
  }

  const relVol = safeNumber(candidate.relativeVolume)
  const dailyMove = safeNumber(candidate.dailyMovePct)
  const revenue = safeNumber(candidate.annualRevenue ?? candidate.financials?.revenue)
  const marketCap = safeNumber(candidate.marketCap)
  const currentRatio = safeNumber(candidate.financials?.currentRatio ?? candidate.overview?.currentRatio)
  const confidence = safeNumber(candidate.confidence_score ?? candidate.confidenceScore)

  if (relVol !== null) push('relative volume', `${round(relVol, 2)}x`)
  if (dailyMove !== null) push('daily move', `${round(dailyMove, 2)}%`)
  if (revenue !== null) push('revenue', `$${Math.round(revenue).toLocaleString('en-US')}`)
  if (marketCap !== null) push('market cap', `$${Math.round(marketCap).toLocaleString('en-US')}`)
  if (currentRatio !== null) push('current ratio', round(currentRatio, 2))
  if (confidence !== null) push('verification confidence', confidence)

  for (const factor of strongestFactors(scorecard, 2)) {
    push('positive factor', `${factor.label} (${round(factor.rawScore, 1)} raw / ${round(factor.contribution, 2)} weighted)`)
  }

  return facts.slice(0, 6)
}

function cautionFlags(candidate = {}, scorecard = {}) {
  const flags = []
  const verificationStatus = candidate.verification_status || candidate.verificationStatus || 'UNVERIFIED'
  const riskAnnotation = candidate.risk_annotation || candidate.riskAnnotation || candidate.verification?.risk_annotation || null
  if (verificationStatus !== 'VERIFIED') flags.push(verificationStatus)
  if (riskAnnotation) flags.push(riskAnnotation)
  if ((candidate.validation_flags || candidate.validationFlags || []).length) {
    flags.push(...(candidate.validation_flags || candidate.validationFlags || []))
  }
  if ((candidate.rejection_reasons || candidate.rejectionReasons || []).length) {
    flags.push(...(candidate.rejection_reasons || candidate.rejectionReasons || []))
  }
  if (safeNumber(scorecard.low_confidence_penalty) !== null && safeNumber(scorecard.low_confidence_penalty) < 1) {
    flags.push(`penalty x${scorecard.low_confidence_penalty}`)
  }
  return [...new Set(flags)].slice(0, 5)
}

function riskLevel(candidate = {}, scorecard = {}) {
  const verificationStatus = candidate.verification_status || candidate.verificationStatus || 'UNVERIFIED'
  const penaltyMultiplier = safeNumber(scorecard.low_confidence_penalty, 1)
  const riskPenalty = safeNumber(scorecard.riskPenalty ?? scorecard.risk_penalty, 0)
  if (verificationStatus === 'LOW_CONFIDENCE' || penaltyMultiplier < 1 || riskPenalty >= 1.5) return 'High'
  if (verificationStatus === 'VERIFIED_WITH_CAUTIONS' || riskPenalty >= 1) return 'Medium'
  return 'Low'
}

function entryGuidance(candidate = {}, scorecard = {}) {
  const price = safeNumber(candidate.price)
  const recommendation = recommendationFromScore(scorecard)
  if (price === null) return 'No entry guidance until live price is confirmed.'
  if (recommendation === 'BUY') return `Starter entry near $${round(price, 2)}; add only if volume and verification remain intact.`
  if (recommendation === 'WATCH') return `Watch near $${round(price, 2)} and wait for a stronger trigger before sizing.`
  return `Pass at $${round(price, 2)} unless score and verification improve.`
}

function monitoringTrigger(candidate = {}, scorecard = {}) {
  const topWeak = strongestWeaknesses(scorecard, 1)[0]
  if (candidate.risk_annotation === 'SOURCE_MISMATCH') return 'Recheck source agreement before any action.'
  if (candidate.risk_annotation === 'PARTIAL_DATA') return 'Fill missing critical fields before upgrading the name.'
  if (safeNumber(candidate.relativeVolume) !== null) return `Monitor whether relative volume stays above ${round(candidate.relativeVolume, 2)}x and the weakest factor (${topWeak?.label || 'timing'}) improves.`
  return `Monitor the weakest factor (${topWeak?.label || 'timing'}) and any verification caution before promoting.`
}

function primaryThesis(candidate = {}, scorecard = {}) {
  const topFactor = strongestFactors(scorecard, 1)[0]
  const ownReason = scorecard.reasons?.own
  if (ownReason && topFactor) return `${ownReason}; ranking is supported by ${topFactor.label.toLowerCase()} (${round(topFactor.rawScore, 1)} raw).`
  if (ownReason) return ownReason
  if (topFactor) return `${candidate.companyName || candidate.ticker} ranks because ${topFactor.label.toLowerCase()} contributed ${round(topFactor.contribution, 2)} points.`
  return `${candidate.companyName || candidate.ticker} remains on the board because the scored setup is still actionable.`
}

function primaryRisk(candidate = {}, scorecard = {}) {
  const reasons = candidate.rejection_reasons || candidate.rejectionReasons || []
  const weak = strongestWeaknesses(scorecard, 1)[0]
  if (reasons.length) return reasons[0]
  if (scorecard.reasons?.avoid) return scorecard.reasons.avoid
  if (weak) return `${weak.label} is the weakest factor at ${round(weak.rawScore, 1)} raw.`
  return 'Monitor for verification drift or weakening liquidity.'
}

function whyPassed(candidate = {}, scorecard = {}) {
  const verificationStatus = candidate.verification_status || candidate.verificationStatus || 'UNVERIFIED'
  const positives = strongestFactors(scorecard, 2).map((factor) => `${factor.label} ${round(factor.rawScore, 1)}`)
  return `${candidate.ticker} passed because verification is ${verificationStatus}, final score is ${round(scorecard.finalScore ?? scorecard.finalRankScore ?? 0, 2)}, and the strongest factors are ${positives.join(' + ')}.`
}

function rankingExplanation(candidate = {}, rank, total, scorecard = {}) {
  const penaltyMultiplier = safeNumber(scorecard.low_confidence_penalty, 1)
  const strongest = strongestFactors(scorecard, 2).map((factor) => `${factor.label} (${round(factor.contribution, 2)})`)
  return {
    rank,
    out_of: total,
    final_score: scorecard.finalScore ?? scorecard.finalRankScore ?? null,
    score: scorecard.signalScore ?? scorecard.weightedScore ?? null,
    penalty_impact: penaltyMultiplier < 1 ? round(1 - penaltyMultiplier, 2) : 0,
    verification_status: candidate.verification_status || candidate.verificationStatus || 'UNVERIFIED',
    strongest_positive_factors: strongest,
    caution_flags: cautionFlags(candidate, scorecard),
    explanation: `${candidate.ticker} ranks #${rank} of ${total} on a final score of ${round(scorecard.finalScore ?? scorecard.finalRankScore ?? 0, 2)} with verification ${(candidate.verification_status || candidate.verificationStatus || 'UNVERIFIED').toLowerCase()}.`,
  }
}

function executiveDecisionBlock(candidate = {}, scorecard = {}) {
  return {
    ticker: candidate.ticker,
    company_name: candidate.companyName,
    verification_status: candidate.verification_status || candidate.verificationStatus || 'UNVERIFIED',
    final_score: scorecard.finalScore ?? scorecard.finalRankScore ?? null,
    recommendation: recommendationFromScore(scorecard),
    entry_guidance: entryGuidance(candidate, scorecard),
    risk_level: riskLevel(candidate, scorecard),
    primary_thesis: primaryThesis(candidate, scorecard),
    primary_risk: primaryRisk(candidate, scorecard),
    monitoring_trigger: monitoringTrigger(candidate, scorecard),
    supporting_facts: supportingFacts(candidate, scorecard),
  }
}

export function generateReportIntelligence({ run, mode = 'weekly', candidates = [], primary = null }) {
  const runDir = pathForRun(run.id)
  ensureDir(runDir)
  const ranked = candidates.map((candidate, index) => {
    const scorecard = candidate.scorecard || {}
    const executive = executiveDecisionBlock(candidate, scorecard)
    return {
      ticker: candidate.ticker,
      company_name: candidate.companyName,
      why_it_passed: whyPassed(candidate, scorecard),
      why_it_ranked_here: rankingExplanation(candidate, index + 1, candidates.length, scorecard).explanation,
      main_opportunity: executive.primary_thesis,
      main_risk: executive.primary_risk,
      monitoring_next: executive.monitoring_trigger,
      executive_decision: executive,
      ranking_explanation: rankingExplanation(candidate, index + 1, candidates.length, scorecard),
    }
  })

  const artifact = {
    run_id: run.id,
    mode,
    analysis_date: run.analysisDate,
    generated_at: new Date().toISOString(),
    primary_ticker: primary?.ticker || null,
    executive_summary_candidates: ranked.map((item) => item.executive_decision),
    ranked_candidates: ranked,
  }

  const artifactPath = path.join(runDir, 'report_intelligence.json')
  writeJson(artifactPath, artifact)
  return { artifact, artifactPath }
}
