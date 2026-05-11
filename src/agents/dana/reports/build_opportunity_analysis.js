import { isoDate, money, num, pct } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

export function buildOpportunityAnalysis(candidate, scorecard, context = {}) {
  const c = candidate || {}
  const values = {
    ticker: c.ticker || '—',
    company_name: c.companyName || '—',
    sector: c.sector || '—',
    analysis_date: context.analysisDate || isoDate(),
    analyst: "Dana / Dana's Team",
    current_price: money(c.price),
    confidence_level: scorecard?.confidenceLevel || 'Low',
    source_quality: c.dataQuality || 'Low',
    freshness_timestamp: c.timestamp || new Date().toISOString(),
    recommendation: scorecard?.recommendation || 'PASS',
    not_financial_advice: 'This is for internal research only.',
    investment_thesis: bulletLines([
      `${c.companyName || c.ticker} is trading in the $1-$10 screen with a setup that merits closer review.`,
      'The key thesis is that current market attention may be lagging recent catalysts and liquidity.',
      `The scorecard currently ranks the idea at ${num(scorecard?.weightedScore, 2)} with ${scorecard?.finalRating || 'Pass'} quality.`,
    ]),
    business_snapshot: bulletLines([
      `company name: ${c.companyName || 'Not available'}`,
      `ticker / exchange: ${c.ticker || 'Not available'}`,
      `sector / industry: ${c.sector || 'Not available'} / ${c.industry || 'Not available'}`,
      `business model: ${c.businessModel || 'Not available'}`,
      `primary customer: ${c.primaryCustomer || 'Not available'}`,
      `factual business notes: ${c.factualNotes || 'Not available from whitelisted sources.'}`,
    ]),
    mispricing: bulletLines([
      c.catalystNewsPresence ? 'recent news/catalyst surfaced in the scan.' : 'no strong catalyst signal surfaced yet, so the idea may still be underfollowed.',
      `relative volume is ${c.relativeVolume ? `${num(c.relativeVolume, 2)}x` : 'not available'}, which can indicate renewed attention.`,
      `daily move is ${c.dailyMovePct !== null && c.dailyMovePct !== undefined ? pct(c.dailyMovePct, 1) : 'not available'}, suggesting active positioning.`,
      `expectation gap: ${c.expectationGap || 'Not available'}`,
    ]),
    competitive_position: bulletLines([
      `moat assessment: ${c.moatAssessment || 'Not available'}`,
      `share position: ${c.sharePosition || 'Not available'}`,
      `key differentiator: ${c.keyDifferentiator || 'Not available'}`,
      `main competitors: ${c.mainCompetitors || 'Not available from whitelisted sources.'}`,
    ]),
    financial_snapshot: bulletLines([
      `revenue growth: ${c.financials?.revenueGrowth !== null && c.financials?.revenueGrowth !== undefined ? pct(c.financials.revenueGrowth * 100, 1) : 'Not available'}`,
      `gross margin: ${c.financials?.grossMargin !== null && c.financials?.grossMargin !== undefined ? pct(c.financials.grossMargin * 100, 1) : 'Not available'}`,
      `operating margin: ${c.financials?.operatingMargin !== null && c.financials?.operatingMargin !== undefined ? pct(c.financials.operatingMargin * 100, 1) : 'Not available'}`,
      `free cash flow: ${c.financials?.freeCashFlow !== null && c.financials?.freeCashFlow !== undefined ? money(c.financials.freeCashFlow, 0) : 'Not available'}`,
      `debt / liquidity: ${c.financials?.debtLiquidity || 'Not available'}`,
      `factual trend summary: ${c.financialsTrend || 'Not available'}`,
    ]),
    valuation_view: bulletLines([
      `current multiple: ${c.valuationMultiple || 'Not available'}`,
      `historical range: ${c.historicalRange || 'Not available'}`,
      `peer range: ${c.peerRange || 'Not available'}`,
      `valuation conclusion: ${c.valuationConclusion || 'Not available'}`,
    ]),
    catalysts: bulletLines([
      c.catalyst1 || 'Catalyst 1 not available',
      c.catalyst2 || 'Catalyst 2 not available',
      c.catalyst3 || 'Catalyst 3 not available',
    ]),
    key_risks: bulletLines([
      c.risk1 || 'Risk 1 not available',
      c.risk2 || 'Risk 2 not available',
      c.risk3 || 'Risk 3 not available',
    ]),
    final_view: bulletLines([
      `recommendation: ${scorecard?.recommendation || 'PASS'}`,
      `conviction score out of 10: ${num(scorecard?.weightedScore || 0, 1)}`,
      `target price: ${c.price ? money(c.price * 1.35) : 'Not available'}`,
      `stop price: ${c.price ? money(c.price * 0.85) : 'Not available'}`,
      `key thesis-break condition: ${c.thesisBreakCondition || 'sustained deterioration in liquidity, catalyst cadence, or business/financial quality'}`,
      c.passedReason ? `why passed: ${c.passedReason}` : 'why passed: not available',
      c.comparisonSummary ? `comparison vs prior run: ${c.comparisonSummary.trend} (${c.comparisonSummary.signalDelta ?? 'n/a'} / ${c.comparisonSummary.confidenceDelta ?? 'n/a'})` : 'comparison vs prior run: new or untracked',
    ]),
    required_output_fields: bulletLines([
      'recommendation',
      'conviction score out of 10',
      'target price',
      'stop price',
      '3 key catalysts',
      '3 key risks',
      'why now',
      'key risk',
      'thesis-break condition',
    ]),
  }
  return renderDanaTemplate('INV_Stock_Opportunity_Analysis.md', values, { requiredPlaceholders: Object.keys(values) })
}
