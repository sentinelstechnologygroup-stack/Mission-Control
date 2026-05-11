import { isoDate, money, num, pct, round, clamp } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

export function buildScenarioAnalysis(candidate, scorecard, context = {}) {
  const c = candidate || {}
  const price = Number(c.price) || 0
  const upsideBase = clamp((scorecard?.weightedScore || 5) * 0.09, 0.12, 0.90)
  const downsideBase = clamp((10 - (scorecard?.weightedScore || 5)) * 0.05, 0.08, 0.45)
  const bearProb = clamp(round(25 + ((scorecard?.riskPenalty || 0) * 5), 0), 10, 55)
  const bullProb = clamp(round(25 + ((scorecard?.confidenceScore || 50) / 10), 0), 15, 60)
  let baseProb = 100 - bearProb - bullProb
  if (baseProb < 5) baseProb = 5
  const total = bearProb + baseProb + bullProb
  const adjustedBase = baseProb + (100 - total)
  const entry = price ? round(price * 1.02, 2) : null
  const stop = price ? round(price * 0.85, 2) : null
  const bearTarget = price ? round(price * (1 - downsideBase), 2) : null
  const baseTarget = price ? round(price * (1 + upsideBase * 0.6), 2) : null
  const bullTarget = price ? round(price * (1 + upsideBase * 1.5), 2) : null
  const weightedExpectedReturn = price ? round(((bearProb / 100) * ((bearTarget - price) / price)) + ((adjustedBase / 100) * ((baseTarget - price) / price)) + ((bullProb / 100) * ((bullTarget - price) / price)), 3) : null
  const weightedExpectedDollarResult = price ? round(price * weightedExpectedReturn, 2) : null
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
    scenario_setup: bulletLines([
      `current price: ${money(price)}`,
      `entry price: ${money(entry)}`,
      `capital at risk: ${price ? money(price * 0.15) : 'Not available'}`,
      'time horizon: 3-6 months',
      `stop-loss level: ${money(stop)}`,
    ]),
    scenario_table: `| Scenario | Probability | Target Price | Return vs Entry | Notes |\n|---|---:|---:|---:|---|\n| Bear | ${bearProb}% | ${money(bearTarget)} | ${price ? pct(((bearTarget - price) / price) * 100, 1) : '—'} | catalyst fades / liquidity weakens |\n| Base | ${adjustedBase}% | ${money(baseTarget)} | ${price ? pct(((baseTarget - price) / price) * 100, 1) : '—'} | hold range with modest follow-through |\n| Bull | ${bullProb}% | ${money(bullTarget)} | ${price ? pct(((bullTarget - price) / price) * 100, 1) : '—'} | catalyst expands and volume persists |`,
    expected_value: bulletLines([
      `weighted expected return: ${weightedExpectedReturn !== null ? pct(weightedExpectedReturn * 100, 1) : 'Not available'}`,
      `weighted expected dollar result: ${weightedExpectedDollarResult !== null ? money(weightedExpectedDollarResult) : 'Not available'}`,
    ]),
    outcome_drivers: bulletLines([
      'bullish catalyst: more news, stronger relative volume, sustained close above range',
      'bearish catalyst: loss of volume, negative filing/news, or failure to hold entry',
    ]),
    position_rules: bulletLines([
      `initial stop: ${money(stop)}`,
      `add level: ${price ? money(price * 1.10) : 'Not available'}`,
      `trim level: ${price ? money(price * 1.25) : 'Not available'}`,
      'thesis review trigger: if the catalyst window passes without confirmation',
    ]),
    required_model_fields: bulletLines([
      'current price',
      'entry price',
      'capital at risk',
      'time horizon',
      'stop-loss level',
      'bear probability',
      'base probability',
      'bull probability',
      'bear target',
      'base target',
      'bull target',
      'weighted expected return',
      'weighted expected dollar result',
    ]),
    validation_rules: bulletLines([
      'probabilities must total 100%',
      'the model should preserve the locked range and stop discipline',
    ]),
  }
  return renderDanaTemplate('INV_Scenario_Analysis.md', values, { requiredPlaceholders: Object.keys(values) })
}
