import { isoDate, money, num, pct, round } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

export function buildCapitalDeployment(candidate, scorecard, context = {}) {
  const c = candidate || {}
  const price = Number(c.price) || 0
  const conviction = Number(scorecard?.weightedScore || 5)
  const suggestedSize = price ? `${round(Math.min(3, Math.max(0.5, conviction * 0.3)), 1)}% portfolio` : 'Not available'
  const target = price ? round(price * (1 + Math.max(0.12, conviction * 0.08)), 2) : null
  const stop = price ? round(price * 0.85, 2) : null
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
    opportunity_summary: bulletLines([
      `opportunity score: ${num(scorecard?.weightedScore, 2)}`,
      `base target: ${money(target)}`,
      `upside %: ${price ? pct(((target - price) / price) * 100, 1) : 'Not available'}`,
      `risk/reward: ${price ? num((target - price) / Math.max(0.01, price - stop), 2) : 'Not available'}`,
      `conviction level: ${scorecard?.confidenceLevel || 'Low'}`,
    ]),
    portfolio_context: bulletLines([
      'current sector exposure: Not yet wired to a live portfolio ledger',
      'correlation with existing positions: Not yet wired to the live portfolio ledger',
      `liquidity metric: ${c.liquidityMetric ? money(c.liquidityMetric, 0) : 'Not available'}`,
    ]),
    deployment_plan: bulletLines([
      `starter entry: ${money(price ? price * 1.01 : null)}`,
      `add levels: ${price ? `${money(price * 1.08)} / ${money(price * 1.14)}` : 'Not available'}`,
      `exit level: ${money(target)}`,
      `initial stop: ${money(stop)}`,
      `thesis break condition: ${scorecard?.reasons?.avoid || 'thesis quality deteriorates'}`,
    ]),
    risk_controls: bulletLines([
      `position size cap: ${suggestedSize}`,
      'review cadence: daily until catalyst confirmation, then weekly',
    ]),
    final_recommendation: bulletLines([
      `final action: ${scorecard?.recommendation || 'PASS'}`,
      'rationale: follow the scorecard, scenario, and liquidity checks before deployment.',
    ]),
    required_output_fields: bulletLines([
      'opportunity score',
      'base target',
      'upside %',
      'risk/reward',
      'conviction level',
      'current sector exposure',
      'correlation with existing positions',
      'starter entry',
      'add levels',
      'exit level',
      'initial stop',
      'thesis break condition',
      'position size cap',
      'review cadence',
      'final action',
    ]),
  }
  return renderDanaTemplate('INV_Capital_Deployment.md', values, { requiredPlaceholders: Object.keys(values) })
}
