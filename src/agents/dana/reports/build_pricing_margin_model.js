import { isoDate, money, num, pct } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

export function buildPricingMarginModel(candidate, scorecard, context = {}) {
  const c = candidate || {}
  const o = c.overview || {}
  const f = c.financials || {}
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
    revenue_model_breakdown: bulletLines([
      `revenue proxy: ${f.revenue ? money(f.revenue, 0) : 'Not available'}`,
      `business summary: ${o.longBusinessSummary ? o.longBusinessSummary.slice(0, 260) : 'Not available'}`,
      `key margin signal: gross margin ${f.grossMargin !== null && f.grossMargin !== undefined ? pct(f.grossMargin * 100, 1) : 'Not available'}`,
    ]),
    pricing_power_assessment: bulletLines([
      `pricing power: ${o.priceToSalesTrailing12Months ? num(o.priceToSalesTrailing12Months, 2) : 'Not available'}`,
      `valuation proxy: ${o.trailingPE ? num(o.trailingPE, 2) : 'Not available'}`,
      `revenue growth proxy: ${o.revenueGrowth !== null && o.revenueGrowth !== undefined ? pct(o.revenueGrowth * 100, 1) : 'Not available'}`,
    ]),
    margin_structure: bulletLines([
      `gross margin trend: ${f.grossMargin !== null && f.grossMargin !== undefined ? pct(f.grossMargin * 100, 1) : 'Not available'}`,
      `operating margin trend: ${f.operatingMargin !== null && f.operatingMargin !== undefined ? pct(f.operatingMargin * 100, 1) : 'Not available'}`,
      `net margin trend: ${f.netMargin !== null && f.netMargin !== undefined ? pct(f.netMargin * 100, 1) : 'Not available'}`,
      `FCF margin trend: ${f.fcf && f.revenue ? pct((f.fcf / f.revenue) * 100, 1) : 'Not available'}`,
    ]),
    sensitivity_notes: bulletLines([
      'higher relative volume can support a better entry window.',
      `balance-sheet strength: current ratio ${f.currentRatio ? num(f.currentRatio, 2) : 'Not available'}.`,
      'margin durability should be rechecked if the catalyst window changes.',
    ]),
    conclusion: bulletLines([
      `margin quality: ${f.grossMargin !== null && f.grossMargin !== undefined ? (f.grossMargin > 0.4 ? 'Strong' : f.grossMargin > 0.2 ? 'Mixed' : 'Weak') : 'Not available'}`,
      `pricing power: ${o.priceToSalesTrailing12Months !== null && o.priceToSalesTrailing12Months !== undefined ? 'Observed' : 'Not available'}`,
      'margin outlook: determine alongside the scorecard and scenario analysis.',
    ]),
    required_output_fields: bulletLines([
      'margin quality',
      'pricing power',
      'margin outlook',
      'revenue segment notes',
      'gross margin trend',
      'operating margin trend',
      'net margin trend',
      'FCF margin trend',
    ]),
  }
  return renderDanaTemplate('INV_Pricing_Margin_Model.md', values, { requiredPlaceholders: Object.keys(values) })
}
