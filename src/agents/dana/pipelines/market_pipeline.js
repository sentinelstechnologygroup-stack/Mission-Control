import { scanMarket } from '../agents/research/market_scanner.js'
import { ingestCandidates } from '../agents/research/data_ingestion.js'
import { scoreCandidates } from '../agents/research/scoring_engine.js'
import { getDanaConfig } from '../config/index.js'
import { normalizeCandidates } from './normalization_pipeline.js'
import { isVerificationApproved, verifyCandidates } from '../agents/research/secondary_verification.js'
import { pathForRun, writeJson } from '../agents/research/utils.js'

function buildVerificationExport(candidate, scoredCandidate = null, configSnapshot = null) {
  const scorecard = scoredCandidate?.scorecard || null
  const decisionTrace = candidate.decision_trace || candidate.decisionTrace || candidate.verification?.decision_trace || {
    passed_filters: [],
    failed_filters: [],
    verification_flags: [],
    penalty_applied: false,
    final_score_inputs: {},
  }
  return {
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    exchange: candidate.exchange,
    marketCap: candidate.marketCap,
    averageVolume: candidate.averageVolume,
    price: candidate.price,
    volume: candidate.volume,
    source_count: candidate.source_count ?? candidate.sourceCount ?? 0,
    data_confidence: candidate.data_confidence ?? candidate.dataConfidence ?? 0,
    missing_fields: candidate.missing_fields ?? candidate.missingFields ?? [],
    validation_status: candidate.validation_status || candidate.validationStatus,
    verification_status: candidate.verification_status || candidate.verificationStatus,
    rejection_reasons: candidate.rejection_reasons || candidate.rejectionReasons || [],
    rejection_categories: candidate.rejection_categories || candidate.rejectionCategories || candidate.verification?.rejection_categories || null,
    risk_annotation: candidate.risk_annotation || candidate.riskAnnotation || candidate.verification?.risk_annotation || null,
    confidence_score: candidate.confidence_score ?? candidate.confidenceScore ?? 0,
    source_agreement: candidate.source_agreement || candidate.sourceAgreement,
    critical_field_check: candidate.critical_field_check || candidate.criticalFieldCheck,
    source_comparison: candidate.verification?.source_comparison || null,
    decision_trace: {
      ...decisionTrace,
      penalty_applied: Boolean(scorecard && (scorecard.low_confidence_penalty ?? 1) < 1) || Boolean(decisionTrace.penalty_applied),
      final_score_inputs: {
        ...(decisionTrace.final_score_inputs || {}),
        signal_score: scorecard?.signalScore ?? null,
        data_confidence: candidate.data_confidence ?? candidate.dataConfidence ?? null,
        low_confidence_penalty: scorecard?.low_confidence_penalty ?? 1,
        final_score: scorecard?.finalScore ?? null,
        final_rank_score: scorecard?.finalRankScore ?? null,
        config_snapshot: configSnapshot,
      },
    },
    scoreable: Boolean(candidate.scoreable),
    verification: candidate.verification || null,
  }
}

export async function runMarketPipeline(options = {}) {
  const cfg = getDanaConfig()
  const validationConfig = {
    ...(cfg.validation || {}),
    ...(options.validation || {}),
  }
  const scan = await scanMarket(options)
  const normalized = normalizeCandidates(scan.shortlisted || scan.candidates || [])
  const ingested = await ingestCandidates(normalized, options)
  const validated = verifyCandidates(ingested, options)
  const scoreable = validated.filter((candidate) => isVerificationApproved(candidate))
  const blockedCandidates = validated.filter((candidate) => (candidate.verification_status || candidate.verificationStatus) === 'REJECTED')
  const lowConfidenceCandidates = scoreable.filter((candidate) => (candidate.verification_status || candidate.verificationStatus) === 'LOW_CONFIDENCE')
  const rejectedCandidates = blockedCandidates
  const scored = scoreCandidates(scoreable)
  const scoredByTicker = new Map(scored.map((candidate) => [candidate.ticker, candidate]))
  const configSnapshot = {
    min_market_cap: validationConfig.minMarketCap,
    min_avg_volume: validationConfig.minAverageVolume,
    max_negative_cash_flow: validationConfig.maxNegativeCashFlow,
    max_debt_ratio: validationConfig.maxDebtRatio,
    max_missing_critical_fields: validationConfig.maxMissingCriticalFields,
    max_price_deviation_pct: validationConfig.priceDeviationThreshold,
    max_market_cap_deviation_pct: validationConfig.marketCapDeviationThreshold,
    low_confidence_penalty: validationConfig.lowConfidencePenalty,
    allowed_exchanges: validationConfig.allowedExchanges,
  }

  const verificationRecords = validated.map((candidate) => buildVerificationExport(candidate, scoredByTicker.get(candidate.ticker) || null, configSnapshot))
  const verificationPath = options.verificationOutputPath || (options.runId ? pathForRun(options.runId, 'verification.json') : null)
  if (verificationPath) {
    writeJson(verificationPath, {
      runId: options.runId || null,
      createdAt: new Date().toISOString(),
      total: validated.length,
      rejected: rejectedCandidates.length,
      low_confidence: lowConfidenceCandidates.length,
      verified: validated.filter((candidate) => {
        const status = candidate.verification_status || candidate.verificationStatus
        return status === 'VERIFIED' || status === 'VERIFIED_WITH_CAUTIONS'
      }).length,
      verification_summary: {
        total: validated.length,
        rejected: rejectedCandidates.length,
        low_confidence: lowConfidenceCandidates.length,
        verified: validated.filter((candidate) => {
          const status = candidate.verification_status || candidate.verificationStatus
          return status === 'VERIFIED' || status === 'VERIFIED_WITH_CAUTIONS'
        }).length,
        rejection_breakdown: {
          liquidity: rejectedCandidates.filter((candidate) => candidate.rejection_categories?.liquidity || candidate.rejectionCategories?.liquidity).length,
          exchange: rejectedCandidates.filter((candidate) => candidate.rejection_categories?.exchange || candidate.rejectionCategories?.exchange).length,
          fundamentals: rejectedCandidates.filter((candidate) => candidate.rejection_categories?.fundamentals || candidate.rejectionCategories?.fundamentals).length,
          data_quality: rejectedCandidates.filter((candidate) => candidate.rejection_categories?.data_quality || candidate.rejectionCategories?.data_quality).length,
          risk_flags: rejectedCandidates.filter((candidate) => candidate.rejection_categories?.risk_flags || candidate.rejectionCategories?.risk_flags).length,
        },
      },
      config_snapshot: configSnapshot,
      candidates: verificationRecords,
    })
  }

  return {
    scan,
    normalizedCandidates: normalized,
    ingestedCandidates: ingested,
    validatedCandidates: validated,
    verificationRecords,
    verificationPath,
    scoreableCandidates: scoreable,
    blockedCandidates,
    lowConfidenceCandidates,
    rejectedCandidates,
    scoredCandidates: scored,
    shortlist: scored,
    candidates: scored,
    verificationSummary: {
      total: validated.length,
      approved: scored.length,
      blocked: blockedCandidates.length,
      lowConfidence: lowConfidenceCandidates.length,
      rejected: rejectedCandidates.length,
      sourceCountMin: validated.length ? Math.min(...validated.map((candidate) => candidate.source_count || 0)) : 0,
    },
  }
}
