import { getDanaConfig } from '../../config/index.js'
import { clamp, mean, round, scoreToRating, safeArray } from './utils.js'

const FACTOR_KEYS = {
  'Business Quality': 'businessQuality',
  'Management Quality': 'managementQuality',
  'Competitive Moat': 'competitiveMoat',
  'Growth Potential': 'growthPotential',
  'Financial Strength': 'financialStrength',
  'Valuation / Entry': 'valuationEntry',
  'Catalyst Quality': 'catalystQuality',
  'Risk Profile': 'riskProfile',
  'Timing / Setup': 'timingSetup',
}

function scoreRange(value, min, max) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 5
  const n = Number(value)
  if (n <= min) return 0
  if (n >= max) return 10
  return ((n - min) / (max - min)) * 10
}

function inverseScore(value, min, max) {
  return 10 - scoreRange(value, min, max)
}

function fromMetrics(candidate) {
  const o = candidate.overview || {}
  const f = candidate.financials || {}
  const price = Number(candidate.price) || 0
  const low52 = Number(candidate.low52w) || null
  const high52 = Number(candidate.high52w) || null
  const relVol = Number(candidate.relativeVolume) || 0
  const move = Math.abs(Number(candidate.dailyMovePct) || 0)
  const newsCount = safeArray(candidate.news).length
  const filingsCount = safeArray(candidate.filings).length
  const revenueGrowth = Number(o.revenueGrowth ?? o.earningsQuarterlyGrowth ?? 0)
  const grossMargin = Number(f.grossMargin ?? o.grossMargins ?? 0)
  const operatingMargin = Number(f.operatingMargin ?? o.operatingMargins ?? 0)
  const netMargin = Number(f.netMargin ?? 0)
  const currentRatio = Number(f.currentRatio ?? o.currentRatio ?? 0)
  const debtToEquity = Number(o.debtToEquity ?? 0)
  const priceToSales = Number(o.priceToSalesTrailing12Months ?? 0)
  const beta = Number(o.beta ?? 1)
  const cashCoverage = Number(f.cashCoverage ?? 0)
  const debtToCash = Number(f.debtToCash ?? 0)
  const catalystRecency = filingsCount + Math.min(newsCount, 5)
  const rangePosition = low52 && high52 ? (price - low52) / Math.max(0.01, high52 - low52) : 0.5
  return {
    businessQuality: clamp(mean([
      scoreRange(revenueGrowth, -0.2, 0.4),
      scoreRange(grossMargin, 0.05, 0.8),
      scoreRange(operatingMargin, -0.2, 0.3),
      scoreRange(netMargin, -0.2, 0.25),
    ]), 0, 10),
    managementQuality: clamp(mean([
      scoreRange(filingsCount, 0, 10),
      scoreRange(candidate.dataCompleteness, 40, 90),
      scoreRange(newsCount, 0, 8),
    ]), 0, 10),
    competitiveMoat: clamp(mean([
      scoreRange(grossMargin, 0.1, 0.65),
      scoreRange(revenueGrowth, 0.0, 0.35),
      inverseScore(beta, 1.6, 3.0),
    ]), 0, 10),
    growthPotential: clamp(mean([
      scoreRange(revenueGrowth, 0.0, 0.5),
      scoreRange(catalystRecency, 0, 8),
      scoreRange(relVol, 1.0, 4.0),
    ]), 0, 10),
    financialStrength: clamp(mean([
      scoreRange(currentRatio, 0.8, 3.0),
      inverseScore(debtToEquity, 50, 250),
      scoreRange(cashCoverage, 0.2, 1.5),
    ]), 0, 10),
    valuationEntry: clamp(mean([
      inverseScore(priceToSales, 1.0, 8.0),
      inverseScore(rangePosition, 0.0, 1.0),
      scoreRange(candidate.relativeVolume || 0, 1.0, 4.0),
    ]), 0, 10),
    catalystQuality: clamp(mean([
      scoreRange(newsCount, 0, 8),
      scoreRange(filingsCount, 0, 8),
      scoreRange(catalystRecency, 0, 10),
    ]), 0, 10),
    riskProfile: clamp(mean([
      inverseScore(debtToCash, 0.2, 3.0),
      inverseScore(move, 2.0, 25.0),
      scoreRange(candidate.liquidityMetric || 0, 1_000_000, 25_000_000),
    ]), 0, 10),
    timingSetup: clamp(mean([
      scoreRange(relVol, 1.0, 5.0),
      scoreRange(move, 2.0, 20.0),
      scoreRange(newsCount, 0, 8),
    ]), 0, 10),
  }
}

function resolveWeightEntries(weights) {
  const entries = []
  for (const [label, weight] of Object.entries(weights || {})) {
    if (label === 'ratingBands' || !Number.isFinite(Number(weight))) continue
    const key = FACTOR_KEYS[label] || label
    entries.push({ label, key, weight: Number(weight) })
  }
  return entries
}

function weightedScore(rawScores, weights) {
  const entries = resolveWeightEntries(weights)
  const weightedScores = {}
  const factorBreakdown = []
  let total = 0
  for (const { label, key, weight } of entries) {
    const raw = rawScores[key] ?? 5
    const contrib = round(raw * weight, 3)
    weightedScores[label] = contrib
    factorBreakdown.push({ label, key, rawScore: round(raw, 2), weight: round(weight, 4), contribution: contrib })
    total += contrib
  }
  return { weightedScores, factorBreakdown, total: round(total, 2) }
}

function riskPenalty(candidate) {
  const liquidity = Number(candidate.liquidityMetric) || 0
  const relVol = Number(candidate.relativeVolume) || 1
  const move = Math.abs(Number(candidate.dailyMovePct) || 0)
  const debtToEquity = Number(candidate.overview?.debtToEquity ?? 0)
  const missing = Math.max(0, 100 - (Number(candidate.dataCompleteness) || 0))
  return round(clamp((missing * 0.012) + (move * 0.02) + (debtToEquity / 300) + (liquidity < 1_000_000 ? 0.45 : 0) + (relVol < 1.25 ? 0.25 : 0), 0, 3), 2)
}

export function scoreCandidate(candidate) {
  const cfg = getDanaConfig()
  const raw = fromMetrics(candidate)
  const weights = cfg.weights?.weights || cfg.weights || {}
  const { weightedScores, factorBreakdown, total } = weightedScore(raw, weights)
  const dataConfidence = clamp(round(Number(candidate.data_confidence ?? candidate.dataConfidence ?? 0), 3), 0, 1)
  const verificationStatus = candidate.verification_status || candidate.verificationStatus || candidate.validation_status || candidate.validationStatus || 'rejected'
  const lowConfidencePenalty = Number(cfg.validation?.lowConfidencePenalty ?? 1)
  const confidencePenaltyMultiplier = verificationStatus === 'LOW_CONFIDENCE' ? lowConfidencePenalty : 1
  const signalScore = round(total, 2)
  const finalScore = round(signalScore * dataConfidence * confidencePenaltyMultiplier, 2)
  const penalty = riskPenalty(candidate, raw)
  const rating = scoreToRating(signalScore, cfg.weights.ratingBands || [])
  const recommendation = signalScore >= 7 ? 'BUY' : signalScore >= 5.5 ? 'WATCH' : 'PASS'
  const whyOwn = [
    candidate.catalystNewsPresence ? 'recent catalyst/news present' : null,
    candidate.relativeVolume && candidate.relativeVolume >= 1.5 ? `relative volume ${candidate.relativeVolume.toFixed(2)}x` : null,
    candidate.dailyMovePct ? `daily move ${candidate.dailyMovePct.toFixed(2)}%` : null,
  ].filter(Boolean)[0] || 'screened into the $1-$10 range with acceptable setup'
  const whyAvoid = [
    (candidate.liquidityMetric || 0) < 1_000_000 ? 'thin liquidity' : null,
    dataConfidence < 0.75 ? 'limited data confidence' : null,
    confidencePenaltyMultiplier < 1 ? `low confidence penalty x${confidencePenaltyMultiplier}` : null,
    penalty >= 1 ? 'elevated risk penalty' : null,
  ].filter(Boolean).join('; ') || 'no major red flags surfaced'
  const validationStatus = candidate.validation_status || candidate.validationStatus || 'rejected'
  const analysis = {
    rawScores: raw,
    weightedScores,
    factorBreakdown,
    signalScore,
    signal_score: signalScore,
    weightedScore: signalScore,
    weighted_score: signalScore,
    dataConfidence,
    data_confidence: dataConfidence,
    confidencePenaltyMultiplier,
    low_confidence_penalty: confidencePenaltyMultiplier,
    riskPenalty: penalty,
    risk_penalty: penalty,
    finalScore,
    final_score: finalScore,
    finalRankScore: finalScore,
    final_rank_score: finalScore,
    finalRating: rating,
    recommendation,
    validationStatus,
    validation_status: validationStatus,
    reasons: {
      own: whyOwn,
      avoid: whyAvoid,
    },
    rankContext: {
      ticker: candidate.ticker,
      companyName: candidate.companyName,
      relativeVolume: candidate.relativeVolume,
      catalystNewsPresence: candidate.catalystNewsPresence,
      dataCompleteness: candidate.dataCompleteness,
      sourceCount: candidate.source_count ?? candidate.sourceCount ?? 0,
      missingFields: candidate.missing_fields ?? candidate.missingFields ?? [],
    },
  }
  return {
    ...candidate,
    scorecard: analysis,
  }
}

export function scoreCandidates(candidates = []) {
  return candidates
    .map((candidate) => scoreCandidate(candidate))
    .sort((a, b) => (b.scorecard?.finalRankScore || 0) - (a.scorecard?.finalRankScore || 0))
    .map((candidate, index) => ({ ...candidate, scorecard: { ...candidate.scorecard, relativeRank: index + 1 } }))
}
