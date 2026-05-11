import { getDanaConfig } from '../../config/index.js'
import { createCanonicalCandidate } from './schemas.js'
import { asNumber, confidenceBucket, dedupeBy, fetchJson, nowIso, safeArray } from './utils.js'
import { assertWhitelisted, getWhitelistedSources } from './source_whitelist.js'

function screenerUrl(scrId, count = 100) {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved')
  url.searchParams.set('formatted', 'true')
  url.searchParams.set('lang', 'en-US')
  url.searchParams.set('region', 'US')
  url.searchParams.set('scrIds', scrId)
  url.searchParams.set('count', String(count))
  url.searchParams.set('start', '0')
  return url.toString()
}

function newsUrl(symbol) {
  const url = new URL('https://query1.finance.yahoo.com/v2/finance/news')
  url.searchParams.set('symbols', symbol)
  return url.toString()
}

function unwrapField(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if ('raw' in value) return value.raw
    if ('fmt' in value && typeof value.fmt !== 'object') return value.fmt
  }
  return value
}

function textField(value, fallback = '') {
  const unwrapped = unwrapField(value)
  return String(unwrapped ?? fallback ?? '').trim()
}

function numberField(value, fallback = null) {
  return asNumber(unwrapField(value), fallback)
}

function isValidTicker(symbol) {
  const ticker = String(symbol || '').toUpperCase().trim()
  return /^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(ticker) && !ticker.includes(' ')
}

function normalizeQuote(quote, source) {
  const ticker = String(unwrapField(quote.symbol || quote.ticker || '') || '').toUpperCase().trim()
  const price = numberField(quote.regularMarketPrice ?? quote.close ?? quote.lastPrice ?? quote.postMarketPrice)
  const volume = numberField(quote.regularMarketVolume ?? quote.volume)
  const avgVolume = numberField(quote.averageDailyVolume3Month ?? quote.averageVolume ?? quote.averageDailyVolume10Day)
  const relVolume = volume && avgVolume ? volume / avgVolume : null
  const dailyMovePct = numberField(quote.regularMarketChangePercent ?? quote.changePercent ?? quote.percentChange)
  const momentum50 = numberField(quote.fiftyDayAverageChangePercent)
  const momentum200 = numberField(quote.twoHundredDayAverageChangePercent)
  const marketCap = numberField(quote.marketCap ?? quote.market_cap)
  const liquidityMetric = price && volume ? price * volume : null
  const exchange = textField(quote.exchange)
  const fullExchangeName = textField(quote.fullExchangeName)
  const marketState = textField(quote.marketState)
  const sharesOutstanding = numberField(quote.sharesOutstanding)
  const currentPrice = price
  const annualRevenue = null
  const eps = numberField(quote.epsTrailingTwelveMonths)
  const netIncome = null
  const cashFlow = null
  const tradeable = quote.tradeable !== undefined ? Boolean(quote.tradeable) : true
  const quoteType = textField(quote.quoteType)
  const symbolOk = isValidTicker(ticker)
  const equityOk = !quoteType || quoteType === 'EQUITY'
  const otcLike = /OTC|PINK|PENNY/i.test([exchange, fullExchangeName].filter(Boolean).join(' '))
  const scoreSignals = [
    symbolOk,
    equityOk,
    tradeable,
    price !== null && price >= 1 && price <= 10,
    avgVolume ? avgVolume >= 250000 : volume >= 250000,
    relVolume ? relVolume >= 1.5 : false,
    Math.abs(dailyMovePct || 0) >= 4,
    Math.abs(momentum50 || 0) >= 10 || Math.abs(momentum200 || 0) >= 10,
  ]
  const passCount = scoreSignals.filter(Boolean).length
  const status = symbolOk && equityOk && tradeable && passCount >= 5 ? 'pass' : 'review'
  const notes = []
  if (price !== null) notes.push(`price ${price.toFixed(2)} within target band`)
  if (relVolume) notes.push(`relative volume ${relVolume.toFixed(2)}x`)
  if (dailyMovePct !== null) notes.push(`daily move ${dailyMovePct.toFixed(2)}%`)
  if (momentum50 !== null) notes.push(`50d momentum ${momentum50.toFixed(2)}%`)
  if (momentum200 !== null) notes.push(`200d momentum ${momentum200.toFixed(2)}%`)
  return createCanonicalCandidate({
    ticker,
    companyName: textField(quote.shortName || quote.longName || quote.displayName, ''),
    sector: textField(quote.sector || quote.industry, ''),
    industry: textField(quote.industry, ''),
    price,
    volume,
    averageVolume: avgVolume,
    relativeVolume: relVolume,
    dailyMovePct,
    marketMomentumPct: momentum50,
    longMomentumPct: momentum200,
    quoteType,
    tradeable,
    liquidityMetric,
    marketCap,
    exchange,
    fullExchangeName,
    marketState,
    sharesOutstanding,
    currentPrice,
    annualRevenue,
    eps,
    netIncome,
    cashFlow,
    otcLike,
    low52w: numberField(quote.fiftyTwoWeekLow),
    high52w: numberField(quote.fiftyTwoWeekHigh),
    catalystNewsPresence: false,
    initialScannerNotes: notes.join('; '),
    timestamp: nowIso(),
    sourceMeta: { source, screener: source, rawTicker: ticker },
    sources: [source],
    validationSources: {
      yahooScanner: {
        price,
        volume,
        averageVolume: avgVolume,
        relativeVolume: relVolume,
        dailyMovePct,
        marketMomentumPct: momentum50,
        longMomentumPct: momentum200,
        marketCap,
        liquidityMetric,
        exchange,
        fullExchangeName,
        marketState,
        sharesOutstanding,
      },
    },
    scannerStatus: status,
    scannerReasons: scoreSignals,
    marketSignals: {
      quoteType,
      tradeable,
      regularMarketChangePercent: dailyMovePct,
      fiftyDayAverageChangePercent: momentum50,
      twoHundredDayAverageChangePercent: momentum200,
    },
  })
}

async function loadScreener(scrId, cfg) {
  const url = screenerUrl(scrId, cfg.scan.maxScreenerResultsPerSource)
  assertWhitelisted(url, `yahoo screener ${scrId}`)
  const data = await fetchJson(url, { timeoutMs: 15000 })
  const quotes = data?.finance?.result?.[0]?.quotes || []
  return quotes.map((quote) => normalizeQuote(quote, `yahoo:${scrId}`))
}

async function fetchNewsPresence(symbol) {
  const url = newsUrl(symbol)
  assertWhitelisted(url, `yahoo news ${symbol}`)
  try {
    const data = await fetchJson(url, { timeoutMs: 12000 })
    const items = safeArray(data?.content?.result || data?.news || data?.items)
    return {
      present: items.length > 0,
      count: items.length,
      latestTitle: items[0]?.title || items[0]?.headline || '',
      latestTimestamp: items[0]?.published_at || items[0]?.providerPublishTime || null,
      items: items.slice(0, 5),
      source: 'yahoo:news',
    }
  } catch {
    return { present: false, count: 0, latestTitle: '', latestTimestamp: null, items: [], source: 'yahoo:news' }
  }
}

export async function scanMarket(options = {}) {
  const cfg = getDanaConfig()
  const offline = options.offline ?? cfg.scan.offline
  if (offline) {
    return {
      runAt: nowIso(),
      candidates: [],
      shortlisted: [],
      failed: [],
      sources: [],
      notes: ['offline mode enabled; scan skipped'],
    }
  }

  const screenerIds = options.screenerIds || ['day_gainers', 'day_losers', 'most_actives']
  const sources = getWhitelistedSources()
  const results = []
  for (const scrId of screenerIds) {
    if (!sources.yahooScreener?.enabled) continue
    try {
      const quotes = await loadScreener(scrId, cfg)
      results.push(...quotes)
    } catch (error) {
      results.push({
        ticker: '',
        scannerStatus: 'error',
        scannerReasons: [`screener ${scrId} failed: ${error.message}`],
        initialScannerNotes: `source failure: ${scrId}`,
        timestamp: nowIso(),
        sourceMeta: { source: `yahoo:${scrId}`, error: error.message },
        sources: [`yahoo:${scrId}`],
      })
    }
  }

  const candidates = dedupeBy(results.filter((item) => item.ticker && isValidTicker(item.ticker)), (item) => item.ticker)
  const shortlisted = []
  const failed = []

  for (const candidate of candidates) {
    const price = asNumber(candidate.price)
    const volume = asNumber(candidate.volume)
    const avgVolume = asNumber(candidate.averageVolume)
    const relativeVolume = asNumber(candidate.relativeVolume)
    const dailyMovePct = asNumber(candidate.dailyMovePct)
    const momentum50 = asNumber(candidate.marketMomentumPct)
    const momentum200 = asNumber(candidate.longMomentumPct)
    const liquidity = asNumber(candidate.liquidityMetric)
    const quoteType = String(candidate.quoteType || '').toUpperCase()
    const symbolPass = isValidTicker(candidate.ticker)
    const quoteTypePass = !quoteType || quoteType === 'EQUITY'
    const pricePass = price !== null && price >= cfg.scan.priceMin && price <= cfg.scan.priceMax
    const liquid = (avgVolume ?? volume ?? 0) >= cfg.scan.minAverageVolume || (liquidity ?? 0) >= 1_000_000
    const relVolPass = (relativeVolume ?? 0) >= cfg.scan.minRelativeVolume
    const movePass = Math.abs(dailyMovePct ?? 0) >= cfg.scan.minDailyMovePct
    const trendPass = Math.abs(momentum50 ?? 0) >= 10 || Math.abs(momentum200 ?? 0) >= 10 || (candidate.low52w !== null && candidate.high52w !== null && price !== null && price >= candidate.low52w)
    const news = await fetchNewsPresence(candidate.ticker)
    const catalystPass = news.present
    candidate.catalystNewsPresence = catalystPass
    candidate.news = news.items
    candidate.sourceMeta = { ...(candidate.sourceMeta || {}), news }
    candidate.scannerReasons = [
      `symbol ${symbolPass ? 'pass' : 'fail'}`,
      `equity ${quoteTypePass ? 'pass' : 'fail'}`,
      `price range ${pricePass ? 'pass' : 'fail'}`,
      `liquidity ${liquid ? 'pass' : 'fail'}`,
      `relative volume ${relVolPass ? 'pass' : 'fail'}`,
      `daily move ${movePass ? 'pass' : 'fail'}`,
      `trend ${trendPass ? 'pass' : 'fail'}`,
      `news/catalyst ${catalystPass ? 'pass' : 'optional'}`,
    ]
    candidate.scannerStatus = symbolPass && quoteTypePass && pricePass && liquid && (relVolPass || movePass || trendPass) ? 'pass' : 'fail'
    candidate.initialScannerNotes = [
      candidate.initialScannerNotes,
      catalystPass ? `recent catalyst/news found (${news.count})` : 'no recent catalyst/news surfaced',
      `source confidence ${confidenceBucket(candidate.dataCompleteness || 0)}`,
    ].filter(Boolean).join('; ')
    if (candidate.scannerStatus === 'pass') shortlisted.push(candidate)
    else failed.push(candidate)
  }

  const ranked = shortlisted
    .sort((a, b) => (b.relativeVolume || 0) - (a.relativeVolume || 0) || Math.abs(b.dailyMovePct || 0) - Math.abs(a.dailyMovePct || 0) || (b.liquidityMetric || 0) - (a.liquidityMetric || 0) || (b.marketMomentumPct || 0) - (a.marketMomentumPct || 0))
    .slice(0, cfg.scan.maxCandidates)

  return {
    runAt: nowIso(),
    candidates: ranked,
    shortlisted: ranked,
    failed,
    sources: screenerIds.map((id) => `yahoo:${id}`),
    notes: [`scanned ${candidates.length} candidates`, `${ranked.length} shortlisted`],
  }
}
