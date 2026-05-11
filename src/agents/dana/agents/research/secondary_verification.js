import { getDanaConfig } from '../../config/index.js'
import { asNumber, clamp, round, safeArray } from './utils.js'

const VERIFIED = 'VERIFIED'
const VERIFIED_WITH_CAUTIONS = 'VERIFIED_WITH_CAUTIONS'
const LOW_CONFIDENCE = 'LOW_CONFIDENCE'
const REJECTED = 'REJECTED'

function sourceFamily(name = '') {
  const text = String(name || '').trim().toLowerCase()
  if (text.startsWith('yahoo')) return 'yahoo'
  if (text.startsWith('sec')) return 'sec'
  return text.split(':')[0] || ''
}

function isPresent(value) {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

function firstFinite(...values) {
  for (const value of values) {
    const num = asNumber(value, null)
    if (Number.isFinite(num)) return num
  }
  return null
}

function relDiff(a, b) {
  const left = asNumber(a, null)
  const right = asNumber(b, null)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  const denom = Math.max(Math.abs(left), Math.abs(right), 1)
  return Math.abs(left - right) / denom
}

function sourceRecords(candidate = {}) {
  const validationSources = candidate.validationSources || {}
  const scanner = validationSources.yahooScanner || {}
  const quoteSummary = validationSources.yahooQuoteSummary || {}
  const secFacts = validationSources.secCompanyFacts || {}
  const secSubmissions = validationSources.secSubmissions || {}
  const secTicker = validationSources.secTicker || {}
  return { scanner, quoteSummary, secFacts, secSubmissions, secTicker }
}

function sourceCount(candidate) {
  const families = new Set()
  for (const source of safeArray(candidate.sources)) {
    const family = sourceFamily(source)
    if (family) families.add(family)
  }

  const validationSources = candidate.validationSources || {}
  for (const [key, value] of Object.entries(validationSources)) {
    if (!isPresent(value)) continue
    const family = sourceFamily(key)
    if (family) families.add(family)
  }

  return families.size
}

function collectFieldValues(candidate) {
  const { scanner, quoteSummary, secFacts } = sourceRecords(candidate)
  return {
    price: [scanner.price, scanner.currentPrice, candidate.price, quoteSummary.price, quoteSummary.currentPrice].filter((value) => Number.isFinite(asNumber(value, null))),
    volume: [scanner.volume, candidate.volume, candidate.averageVolume, scanner.averageVolume, quoteSummary.volume].filter((value) => Number.isFinite(asNumber(value, null))),
    marketCap: [scanner.marketCap, candidate.marketCap, quoteSummary.marketCap].filter((value) => Number.isFinite(asNumber(value, null))),
    revenue: [secFacts.revenue, candidate.annualRevenue, candidate.financials?.revenue].filter((value) => Number.isFinite(asNumber(value, null))),
    cashFlow: [candidate.cashFlow, candidate.financials?.cashFlow, candidate.financials?.operatingCashFlow, secFacts.cashFlow].filter((value) => Number.isFinite(asNumber(value, null))),
    debtRatio: [candidate.debtRatio, candidate.overview?.debtToEquity, candidate.financials?.debtRatio].filter((value) => Number.isFinite(asNumber(value, null))),
  }
}

function normalizeSymbolText(candidate) {
  return [candidate.ticker, candidate.symbol, candidate.exchange, candidate.quoteType]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase())
    .join(' ')
}

function hasOtcIndicator(candidate) {
  const text = normalizeSymbolText(candidate)
  return Boolean(
    candidate.otc_flag ||
    candidate.otcLike ||
    /\bOTC\b/.test(text) ||
    /\bPINK\b/.test(text) ||
    /\bGREY\b/.test(text) ||
    /\bGREY\s*MARKET\b/.test(text) ||
    /\.(PK|OB|PINK|GREY)$/i.test(String(candidate.ticker || candidate.symbol || '')),
  )
}

function buildComparison(candidate, cfg) {
  const { scanner, quoteSummary, secFacts } = sourceRecords(candidate)
  const issues = []
  const comparisons = []

  const scannerPrice = firstFinite(scanner.price, scanner.currentPrice, candidate.price)
  const quotePrice = firstFinite(quoteSummary.price, quoteSummary.currentPrice, candidate.price)
  const scannerMarketCap = firstFinite(scanner.marketCap, candidate.marketCap)
  const quoteMarketCap = firstFinite(quoteSummary.marketCap, candidate.marketCap)

  if (Number.isFinite(scannerPrice) && Number.isFinite(quotePrice)) {
    const priceDelta = relDiff(scannerPrice, quotePrice)
    comparisons.push({ field: 'price', left: scannerPrice, right: quotePrice, delta: round(priceDelta ?? 0, 3) })
    if (priceDelta !== null && priceDelta > cfg.priceDeviationThreshold) {
      issues.push({ field: 'price', type: 'mismatch', delta: round(priceDelta, 3), detail: `price delta ${round(priceDelta * 100, 1)}%` })
    }
  }

  if (Number.isFinite(scannerMarketCap) && Number.isFinite(quoteMarketCap)) {
    const marketCapDelta = relDiff(scannerMarketCap, quoteMarketCap)
    comparisons.push({ field: 'market_cap', left: scannerMarketCap, right: quoteMarketCap, delta: round(marketCapDelta ?? 0, 3) })
    if (marketCapDelta !== null && marketCapDelta > cfg.marketCapDeviationThreshold) {
      issues.push({ field: 'market_cap', type: 'mismatch', delta: round(marketCapDelta, 3), detail: `market cap delta ${round(marketCapDelta * 100, 1)}%` })
    }
  }

  const secRevenue = firstFinite(secFacts.revenue, candidate.annualRevenue, candidate.financials?.revenue)
  const secShares = firstFinite(secFacts.shares, candidate.sharesOutstanding)
  const secCurrentRatio = firstFinite(secFacts.currentRatio, candidate.financials?.currentRatio, candidate.overview?.currentRatio)
  const yahooCurrentRatio = firstFinite(quoteSummary.currentRatio, candidate.financials?.currentRatio, candidate.overview?.currentRatio)

  if (Number.isFinite(secRevenue) && Number.isFinite(quoteSummary.revenue ?? candidate.annualRevenue ?? candidate.financials?.revenue)) {
    const revenueDelta = relDiff(secRevenue, firstFinite(quoteSummary.revenue, candidate.annualRevenue, candidate.financials?.revenue))
    comparisons.push({ field: 'revenue', left: secRevenue, right: firstFinite(quoteSummary.revenue, candidate.annualRevenue, candidate.financials?.revenue), delta: round(revenueDelta ?? 0, 3) })
  }

  if (Number.isFinite(secShares) && Number.isFinite(firstFinite(quoteSummary.sharesOutstanding, candidate.sharesOutstanding))) {
    const sharesDelta = relDiff(secShares, firstFinite(quoteSummary.sharesOutstanding, candidate.sharesOutstanding))
    comparisons.push({ field: 'shares_outstanding', left: secShares, right: firstFinite(quoteSummary.sharesOutstanding, candidate.sharesOutstanding), delta: round(sharesDelta ?? 0, 3) })
  }

  if (Number.isFinite(secCurrentRatio) && Number.isFinite(yahooCurrentRatio)) {
    const currentRatioDelta = relDiff(secCurrentRatio, yahooCurrentRatio)
    comparisons.push({ field: 'current_ratio', left: secCurrentRatio, right: yahooCurrentRatio, delta: round(currentRatioDelta ?? 0, 3) })
  }

  const trustedSourceCount = [scanner, quoteSummary, secFacts, sourceRecords(candidate).secSubmissions, sourceRecords(candidate).secTicker]
    .filter((value) => isPresent(value)).length

  const hasComparablePair = comparisons.length > 0
  const sourceAgreement = trustedSourceCount >= 2 && hasComparablePair && issues.length === 0 ? 'PASS' : 'FAIL'

  return {
    scanner,
    quoteSummary,
    secFacts,
    trustedSourceCount,
    hasComparablePair,
    sourceAgreement,
    comparisonIssues: issues,
    comparisonSummary: comparisons,
  }
}

function criticalFieldSummary(candidate) {
  const values = collectFieldValues(candidate)
  const critical = {
    price: values.price.length > 0,
    market_cap: values.marketCap.length > 0,
    revenue: values.revenue.length > 0 && values.revenue.some((value) => asNumber(value, 0) > 0),
    volume: values.volume.length > 0,
  }
  const missing = Object.entries(critical).filter(([, present]) => !present).map(([field]) => field)
  return {
    critical,
    missing,
    missingCount: missing.length,
    status: missing.length >= 2 ? 'FAIL' : 'PASS',
  }
}

function liquiditySummary(candidate, cfg) {
  const averageVolume = firstFinite(candidate.averageVolume, candidate.volume)
  const marketCap = firstFinite(candidate.marketCap)
  const revenue = firstFinite(candidate.annualRevenue, candidate.financials?.revenue)
  const cashFlow = firstFinite(candidate.cashFlow, candidate.financials?.cashFlow, candidate.financials?.operatingCashFlow)
  const debtRatio = firstFinite(candidate.debtRatio, candidate.overview?.debtToEquity, candidate.financials?.debtRatio)

  const averageVolumeOk = Number.isFinite(averageVolume) && averageVolume >= cfg.minAverageVolume
  const marketCapOk = Number.isFinite(marketCap) && marketCap >= cfg.minMarketCap
  const revenueOk = Number.isFinite(revenue) && revenue > 0
  const cashFlowOk = !Number.isFinite(cashFlow) || cashFlow >= cfg.maxNegativeCashFlow
  const debtOk = !Number.isFinite(debtRatio) || debtRatio <= cfg.maxDebtRatio

  return {
    averageVolume,
    marketCap,
    revenue,
    cashFlow,
    debtRatio,
    averageVolumeOk,
    marketCapOk,
    revenueOk,
    cashFlowOk,
    debtOk,
  }
}

function buildBaseConfidence({ sourceCount, criticalFieldCheck, comparison, liquidity, missingCount }) {
  let score = 100

  score -= Math.max(0, 2 - sourceCount) * 14
  score -= missingCount * 12
  if (criticalFieldCheck === 'FAIL') score -= 18
  if (!liquidity.averageVolumeOk) score -= 18
  if (!liquidity.marketCapOk) score -= 18
  if (!liquidity.revenueOk) score -= 15
  if (!liquidity.cashFlowOk) score -= 15
  if (!liquidity.debtOk) score -= 10
  score -= comparison.comparisonIssues.length * 20
  if (comparison.sourceAgreement !== 'PASS') score -= 18

  return clamp(round(score, 1), 0, 100)
}

function normalizeExchangeValue(value = '') {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return ''
  if (raw.includes('NASDAQ') || raw === 'NMS' || raw === 'NGM' || raw === 'NCM') return 'NASDAQ'
  if (raw.includes('NYSE') && raw.includes('AMERICAN')) return 'AMEX'
  if (raw.includes('AMEX') || raw === 'ASE') return 'AMEX'
  if (raw.includes('NYSE') || raw === 'NYQ') return 'NYSE'
  return raw
}

function buildHardRejectReasons(candidate, cfg, criticalFieldCheck, liquidity) {
  const reasons = []
  const exchange = normalizeExchangeValue(candidate.exchange || candidate.fullExchangeName)
  const allowedExchanges = new Set((cfg.allowedExchanges || []).map((value) => normalizeExchangeValue(value)))

  if (!exchange || !allowedExchanges.has(exchange)) reasons.push('exchange not in allowed list')
  if (hasOtcIndicator(candidate)) reasons.push('otc indicator detected')
  if (!liquidity.marketCapOk) reasons.push('market cap below threshold')
  if (!liquidity.averageVolumeOk) reasons.push('average volume below threshold')
  if (!liquidity.revenueOk) reasons.push('revenue missing or non-positive')
  if (!liquidity.cashFlowOk && Number.isFinite(liquidity.cashFlow)) reasons.push('severe negative cash flow')
  if (!liquidity.debtOk && Number.isFinite(liquidity.debtRatio)) reasons.push('debt ratio above threshold')
  if (criticalFieldCheck === 'FAIL') reasons.push('missing at least two critical fields')

  return [...new Set(reasons)]
}

function buildRejectionCategories(candidate, comparison, criticalFieldCheck, liquidity, rejectionReasons = []) {
  return {
    liquidity: rejectionReasons.some((reason) => reason.includes('average volume') || reason.includes('market cap')),
    exchange: rejectionReasons.some((reason) => reason.includes('exchange') || reason.includes('otc')),
    fundamentals: rejectionReasons.some((reason) => reason.includes('revenue') || reason.includes('cash flow') || reason.includes('debt ratio')),
    data_quality: criticalFieldCheck === 'FAIL' || comparison.sourceAgreement !== 'PASS' || rejectionReasons.some((reason) => reason.includes('critical fields')),
    risk_flags: !liquidity.cashFlowOk || !liquidity.debtOk,
  }
}

function buildRiskAnnotation(verificationStatus, comparison, criticalFieldCheck) {
  if (verificationStatus !== LOW_CONFIDENCE) return null
  if (comparison.sourceAgreement !== 'PASS') return 'SOURCE_MISMATCH'
  if (criticalFieldCheck === 'FAIL') return 'PARTIAL_DATA'
  return 'DATA_INCONSISTENCY'
}

function buildDecisionTrace({ candidate, verificationStatus, sourceAgreement, criticalFieldCheck, hardRejectReasons, cautionReasons, sourceCountValue, confidenceScore, penaltyApplied, finalScoreInputs }) {
  const passedFilters = []
  const failedFilters = []

  if (sourceCountValue >= 2) passedFilters.push('minimum source count')
  else failedFilters.push('minimum source count')

  if (criticalFieldCheck === 'PASS') passedFilters.push('critical field check')
  else failedFilters.push('critical field check')

  if (sourceAgreement === 'PASS') passedFilters.push('source agreement')
  else failedFilters.push('source agreement')

  if (!hardRejectReasons.some((reason) => reason.includes('exchange') || reason.includes('otc'))) passedFilters.push('exchange gate')
  else failedFilters.push('exchange gate')

  if (!hardRejectReasons.some((reason) => reason.includes('average volume') || reason.includes('market cap'))) passedFilters.push('liquidity gate')
  else failedFilters.push('liquidity gate')

  if (!hardRejectReasons.some((reason) => reason.includes('revenue') || reason.includes('cash flow') || reason.includes('debt ratio'))) passedFilters.push('fundamentals gate')
  else failedFilters.push('fundamentals gate')

  return {
    passed_filters: passedFilters,
    failed_filters: failedFilters,
    verification_flags: [verificationStatus, ...hardRejectReasons, ...cautionReasons].filter(Boolean),
    penalty_applied: Boolean(penaltyApplied),
    final_score_inputs: {
      verification_status: verificationStatus,
      confidence_score: confidenceScore,
      data_confidence: round(confidenceScore / 100, 3),
      source_agreement: sourceAgreement,
      critical_field_check: criticalFieldCheck,
      ...finalScoreInputs,
    },
  }
}

function buildCautionReasons(candidate, cfg, comparison, criticalFieldCheck) {
  const reasons = []
  if (comparison.sourceAgreement !== 'PASS') reasons.push('source agreement failed or was incomplete')
  if (comparison.comparisonIssues.length) reasons.push(...comparison.comparisonIssues.map((issue) => issue.detail))
  if (criticalFieldCheck === 'PASS' && buildMissingFieldCount(candidate) === 1) reasons.push('one critical field missing')
  if (!Number.isFinite(firstFinite(candidate.price)) || !Number.isFinite(firstFinite(candidate.marketCap))) reasons.push('incomplete market snapshot')
  if (sourceCount(candidate) < 2) reasons.push('fewer than two trusted sources')
  return [...new Set(reasons)]
}

function buildMissingFieldCount(candidate) {
  return criticalFieldSummary(candidate).missingCount
}

function buildVerification(candidate = {}, options = {}) {
  const cfg = {
    ...(getDanaConfig().validation || {}),
    ...(options.validation || {}),
  }

  const critical = criticalFieldSummary(candidate)
  const liquidity = liquiditySummary(candidate, cfg)
  const comparison = buildComparison(candidate, cfg)
  const sourceCountValue = sourceCount(candidate)
  const dataConfidence = buildBaseConfidence({
    sourceCount: sourceCountValue,
    criticalFieldCheck: critical.status,
    comparison,
    liquidity,
    missingCount: critical.missingCount,
  })
  const confidenceScore = round(dataConfidence, 1)

  const hardRejectReasons = buildHardRejectReasons(candidate, cfg, critical.status, liquidity)
  const cautionReasons = buildCautionReasons(candidate, cfg, comparison, critical.status)

  let verificationStatus = VERIFIED
  if (hardRejectReasons.length) {
    verificationStatus = REJECTED
  } else if (comparison.sourceAgreement !== 'PASS' || confidenceScore < 70) {
    verificationStatus = LOW_CONFIDENCE
  } else if (cautionReasons.length) {
    verificationStatus = VERIFIED_WITH_CAUTIONS
  }

  const validationStatus = verificationStatus === VERIFIED || verificationStatus === VERIFIED_WITH_CAUTIONS
    ? 'approved'
    : verificationStatus === LOW_CONFIDENCE
      ? 'verify_required'
      : 'rejected'

  const rejectionReasons = verificationStatus === REJECTED ? hardRejectReasons : []
  const sourceAgreement = comparison.sourceAgreement
  const criticalFieldCheck = critical.status
  const rejectionCategories = buildRejectionCategories(candidate, comparison, criticalFieldCheck, liquidity, rejectionReasons)
  const riskAnnotation = buildRiskAnnotation(verificationStatus, comparison, criticalFieldCheck)
  const verificationNotes = [
    ...hardRejectReasons,
    ...cautionReasons,
  ]
  const sourceComparison = {
    price_delta_pct: round((comparison.comparisonSummary.find((item) => item.field === 'price')?.delta ?? 0) * 100, 2),
    market_cap_delta_pct: round((comparison.comparisonSummary.find((item) => item.field === 'market_cap')?.delta ?? 0) * 100, 2),
    sources_used: safeArray(candidate.sources),
  }
  const decisionTrace = buildDecisionTrace({
    candidate,
    verificationStatus,
    sourceAgreement,
    criticalFieldCheck,
    hardRejectReasons,
    cautionReasons,
    sourceCountValue,
    confidenceScore,
    penaltyApplied: verificationStatus === LOW_CONFIDENCE,
    finalScoreInputs: {},
  })

  return {
    ...candidate,
    source_count: sourceCountValue,
    sourceCount: sourceCountValue,
    data_confidence: round(confidenceScore / 100, 3),
    dataConfidence: round(confidenceScore / 100, 3),
    missing_fields: critical.missing,
    missingFields: critical.missing,
    validation_status: validationStatus,
    validationStatus: validationStatus,
    validation_flags: [
      verificationStatus,
      sourceAgreement === 'FAIL' ? 'VERIFY_REQUIRED' : null,
      criticalFieldCheck === 'FAIL' ? 'PARTIAL_DATA' : null,
    ].filter(Boolean),
    validationFlags: [
      verificationStatus,
      sourceAgreement === 'FAIL' ? 'VERIFY_REQUIRED' : null,
      criticalFieldCheck === 'FAIL' ? 'PARTIAL_DATA' : null,
    ].filter(Boolean),
    validation_issues: comparison.comparisonIssues,
    validationIssues: comparison.comparisonIssues,
    verification_status: verificationStatus,
    verificationStatus: verificationStatus,
    rejection_reasons: rejectionReasons,
    rejectionReasons: rejectionReasons,
    rejection_categories: rejectionCategories,
    rejectionCategories,
    risk_annotation: riskAnnotation,
    riskAnnotation,
    confidence_score: confidenceScore,
    confidenceScore: confidenceScore,
    source_agreement: sourceAgreement,
    sourceAgreement: sourceAgreement,
    critical_field_check: criticalFieldCheck,
    criticalFieldCheck: criticalFieldCheck,
    verification: {
      verification_status: verificationStatus,
      rejection_reasons: rejectionReasons,
      confidence_score: confidenceScore,
      source_agreement: sourceAgreement,
      critical_field_check: criticalFieldCheck,
      source_count: sourceCountValue,
      trusted_source_count: comparison.trustedSourceCount,
      comparison_issues: comparison.comparisonIssues,
      comparison_summary: comparison.comparisonSummary,
      source_comparison: sourceComparison,
      rejection_categories: rejectionCategories,
      risk_annotation: riskAnnotation,
      decision_trace: decisionTrace,
      critical_fields: critical,
      liquidity_summary: {
        averageVolume: liquidity.averageVolume,
        marketCap: liquidity.marketCap,
        revenue: liquidity.revenue,
        cashFlow: liquidity.cashFlow,
        debtRatio: liquidity.debtRatio,
      },
      caution_reasons: cautionReasons,
      verification_notes: verificationNotes,
    },
    decision_trace: decisionTrace,
    decisionTrace,
    verificationNotes,
    scoreable: verificationStatus === VERIFIED || verificationStatus === VERIFIED_WITH_CAUTIONS || verificationStatus === LOW_CONFIDENCE,
  }
}

export function verifyCandidate(candidate = {}, options = {}) {
  return buildVerification(candidate, options)
}

export function verifyCandidates(candidates = [], options = {}) {
  return safeArray(candidates).map((candidate) => verifyCandidate(candidate, options))
}

export function isVerificationApproved(candidate = {}) {
  const status = candidate.verification_status || candidate.verificationStatus || candidate.validation_status || candidate.validationStatus || ''
  return status === VERIFIED || status === VERIFIED_WITH_CAUTIONS || status === LOW_CONFIDENCE || status === 'approved'
}

export function isVerificationBlocked(candidate = {}) {
  return !isVerificationApproved(candidate)
}
