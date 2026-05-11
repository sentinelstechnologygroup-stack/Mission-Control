import { isoDate, money, num, pct } from '../agents/research/utils.js'
import { renderDanaTemplate } from './template_loader.js'

function bulletLines(items) {
  return items.map((item) => `- ${item}`).join('\n')
}

export function buildRollup(candidates = [], context = {}) {
  const top = candidates.slice(0, 8)
  const deployable = top[0]
  const values = {
    portfolio_queue_rows: top.map((c, i) => `| ${i + 1} | ${c.ticker || '—'} | ${num(c.scorecard?.weightedScore, 2)} | ${c.scorecard?.finalRating || 'Pass'} | ${c.price ? pct(((c.price * 1.35 - c.price) / c.price) * 100, 1) : '—'} | ${c.price ? num((c.price * 1.35 - c.price) / Math.max(0.01, c.price - (c.price * 0.85)), 2) : '—'} | ${c.scorecard?.recommendation || 'PASS'} |`).join('\n'),
    rollup_summary: bulletLines([
      `best idea right now: ${deployable ? `${deployable.ticker} (${deployable.companyName || 'company'})` : 'Not available'}`,
      `highest upside: ${deployable ? money(deployable.price * 1.35) : 'Not available'}`,
      `lowest risk: ${deployable ? deployable.ticker : 'Not available'}`,
      `highest conviction: ${deployable ? num(deployable.scorecard?.weightedScore, 2) : 'Not available'}`,
      'most urgent follow-up: validate the top candidate against fresh news and filings',
    ]),
    capital_view: bulletLines([
      'available deployable capital: Not yet wired to a live portfolio ledger',
      'deployment cadence: daily research, weekly portfolio review',
      'concentration limits: keep position sizing under the locked risk controls',
    ]),
    decision_notes: bulletLines([
      `new this week: ${top.filter((c) => c.scorecard?.relativeRank <= 3).map((c) => c.ticker).join(', ') || 'Not available'}`,
      `upgraded this week: ${top.filter((c) => (c.scorecard?.weightedScore || 0) >= 7).map((c) => c.ticker).join(', ') || 'Not available'}`,
      `downgraded this week: ${top.filter((c) => (c.scorecard?.weightedScore || 0) < 5.5).map((c) => c.ticker).join(', ') || 'Not available'}`,
      'removed this week: Not yet wired',
    ]),
    weekly_delta_fields: bulletLines([
      'rank',
      'ticker',
      'score',
      'rating',
      'upside',
      'risk/reward',
      'action',
      'best idea right now',
      'highest upside',
      'lowest risk',
      'highest conviction',
      'most urgent follow-up',
      'available deployable capital',
      'deployment cadence',
      'concentration limits',
      'new this week',
      'upgraded this week',
      'downgraded this week',
      'removed this week',
    ]),
    required_output_fields: bulletLines([
      'rank',
      'ticker',
      'score',
      'rating',
      'upside',
      'risk/reward',
      'action',
      'best idea right now',
      'highest upside',
      'lowest risk',
      'highest conviction',
      'most urgent follow-up',
      'available deployable capital',
      'deployment cadence',
      'concentration limits',
      'new this week',
      'upgraded this week',
      'downgraded this week',
      'removed this week',
    ]),
  }
  return renderDanaTemplate('INV_Rollup.md', values, { requiredPlaceholders: Object.keys(values) })
}
