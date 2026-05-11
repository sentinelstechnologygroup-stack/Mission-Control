import { isoDate, money, num, pct, round } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

function numberedLines(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

export function buildExecutiveSummary(candidate, scorecard, context = {}) {
  const c = candidate || {}
  const price = Number(c.price) || 0
  const target = price ? round(price * (1 + Math.max(0.12, (scorecard?.weightedScore || 5) * 0.08)), 2) : null
  const stop = price ? round(price * 0.85, 2) : null
  const upside = price && target ? ((target - price) / price) * 100 : null
  const downside = price && stop ? ((price - stop) / price) * 100 : null
  const rr = price && stop ? (target - price) / Math.max(0.01, price - stop) : null
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
    executive_decision: bulletLines([
      `recommendation: ${scorecard?.recommendation || 'PASS'}`,
      `target: ${money(target)}`,
      `stop: ${money(stop)}`,
      `suggested size: ${scorecard?.confidenceLevel === 'High' ? '2.0% portfolio' : scorecard?.confidenceLevel === 'Medium' ? '1.0% portfolio' : '0.5% portfolio'}`,
      'time horizon: 3-6 months',
    ]),
    fast_summary: bulletLines([
      `what is the opportunity: ${c.companyName || c.ticker} sits in the $1-$10 screen with a live setup worth tracking.`,
      `why now: ${scorecard?.reasons?.own || 'recent setup and catalyst structure'}${c.passedReason ? ` | precision gate: ${c.passedReason}` : ''}`,
      'what must go right: catalysts must convert into sustained liquidity and follow-through.',
      `key risk: ${scorecard?.reasons?.avoid || 'liquidity and thesis decay'}`,
      c.comparisonSummary ? `comparison vs prior run: ${c.comparisonSummary.trend} (${c.comparisonSummary.signalDelta ?? 'n/a'} signal / ${c.comparisonSummary.confidenceDelta ?? 'n/a'} confidence)` : 'comparison vs prior run: new or untracked',
    ]),
    scorecard_snapshot: bulletLines([
      `conviction score: ${num(scorecard?.weightedScore, 1)}`,
      `upside %: ${upside !== null ? pct(upside, 1) : 'Not available'}`,
      `downside %: ${downside !== null ? pct(downside, 1) : 'Not available'}`,
      `risk/reward: ${rr !== null ? num(rr, 2) : 'Not available'}`,
      `catalyst strength: ${num(scorecard?.rawScores?.catalystQuality ?? 0, 1)}`,
    ]),
    bottom_line_takeaways: numberedLines([
      scorecard?.reasons?.own || 'Opportunity deserves a live watchlist slot.',
      `${scorecard?.finalRating || 'Pass'}-level quality according to the locked scorecard.`,
      'Execution should wait for confirmation of catalyst follow-through and liquidity.',
    ]),
    decision_triggers: bulletLines([
      'trigger supporting entry: sustained relative volume and news follow-through',
      'trigger invalidating thesis: loss of liquidity or negative catalyst reversal',
      'trigger requiring re-evaluation: price moves outside the locked scenario range',
    ]),
    required_output_fields: bulletLines([
      'recommendation: BUY / WATCH / PASS',
      'target',
      'stop',
      'suggested size',
      'time horizon',
      'what is the opportunity',
      'why now',
      'what must go right',
      'key risk',
      'conviction score',
      'upside %',
      'downside %',
      'risk/reward',
      'catalyst strength',
    ]),
  }
  return renderDanaTemplate('INV_Executive_Summary.md', values, { requiredPlaceholders: Object.keys(values) })
}
