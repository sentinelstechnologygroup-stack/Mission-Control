import { isoDate, money, num, pct, round } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

function scoringRows(candidate, scorecard) {
  const c = candidate || {}
  const s = scorecard || {}
  const raw = s.rawScores || {}
  const weighted = s.weightedScores || {}
  const rows = [
    ['Business Quality', 0.15, raw.businessQuality, weighted['Business Quality'] || 0, c.financials?.revenue ? `Revenue ${money(c.financials.revenue, 0)} with growth proxy` : 'Company quality proxy'],
    ['Management Quality', 0.10, raw.managementQuality, weighted['Management Quality'] || 0, `${(c.filings || []).length} recent filing(s)`],
    ['Competitive Moat', 0.15, raw.competitiveMoat, weighted['Competitive Moat'] || 0, c.overview?.grossMargins ? `Gross margin proxy ${pct((c.overview.grossMargins || 0) * 100, 1)}` : 'Margin / sector proxy'],
    ['Growth Potential', 0.10, raw.growthPotential, weighted['Growth Potential'] || 0, c.catalystNewsPresence ? 'Catalyst/news present' : 'No fresh catalyst yet'],
    ['Financial Strength', 0.15, raw.financialStrength, weighted['Financial Strength'] || 0, c.financials?.currentRatio ? `Current ratio ${num(c.financials.currentRatio, 2)}` : 'Liquidity / balance-sheet proxy'],
    ['Valuation / Entry', 0.15, raw.valuationEntry, weighted['Valuation / Entry'] || 0, c.low52w && c.high52w ? `52w range ${money(c.low52w)} - ${money(c.high52w)}` : 'Entry / range proxy'],
    ['Catalyst Quality', 0.10, raw.catalystQuality, weighted['Catalyst Quality'] || 0, `${(c.news || []).length} news item(s)`],
    ['Risk Profile', 0.10, raw.riskProfile, weighted['Risk Profile'] || 0, c.liquidityMetric ? `Liquidity metric ${money(c.liquidityMetric, 0)}` : 'Liquidity / volatility proxy'],
    ['Timing / Setup', 0.10, raw.timingSetup, weighted['Timing / Setup'] || 0, c.relativeVolume ? `Relative volume ${round(c.relativeVolume, 2)}x` : 'Setup proxy'],
  ]
  return rows.map(([category, weight, rawScore, contrib, notes]) => `| ${category} | ${pct(weight * 100, 0)} | ${num(rawScore, 1)} | ${num(contrib, 2)} | ${notes} |`).join('\n')
}

export function buildScorecard(candidate, scorecard, context = {}) {
  const c = candidate || {}
  const s = scorecard || {}
  const analysisDate = context.analysisDate || isoDate()
  const recommendation = s.recommendation || 'PASS'
  const values = {
    ticker: c.ticker || '—',
    company_name: c.companyName || '—',
    sector: c.sector || '—',
    analysis_date: analysisDate,
    analyst: "Dana / Dana's Team",
    current_price: money(c.price),
    confidence_level: s.confidenceLevel || 'Low',
    source_quality: c.dataQuality || 'Low',
    freshness_timestamp: c.timestamp || new Date().toISOString(),
    recommendation,
    not_financial_advice: 'This is for internal research only.',
    scoring_rows: scoringRows(c, s),
    selection_notes: bulletLines([
      c.passedReason ? `why passed: ${c.passedReason}` : 'why passed: not available',
      c.comparisonSummary ? `comparison vs prior run: ${c.comparisonSummary.trend}` : 'comparison vs prior run: new or untracked',
      c.topRejectSummary?.length ? `top rejects: ${c.topRejectSummary.join(' | ')}` : 'top rejects: not available',
    ]),
    required_output_fields: bulletLines([
      'total weighted score',
      'final rating',
      'confidence in score',
      'primary reason to own',
      'primary reason to avoid',
      'relative rank vs other active ideas',
    ]),
    rating_bands: bulletLines([
      '8.5 to 10.0 = Strong Buy',
      '7.0 to 8.4 = Buy',
      '5.5 to 6.9 = Watch',
      'below 5.5 = Pass',
    ]),
    validation_checklist: bulletLines([
      'weighted total score is 0.0 to 10.0',
      'final rating matches banding above',
      'the score uses the locked categories and weights only',
      'reasons to own/avoid are concise',
      'include why now if the idea is actionable',
    ]),
  }
  return renderDanaTemplate('INV_Opportunity_Scorecard.md', values, { requiredPlaceholders: Object.keys(values) })
}
