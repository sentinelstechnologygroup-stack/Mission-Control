import { getDanaConfig } from '../../config/index.js'
import { createCanonicalCandidate, createFieldEvidence } from './schemas.js'
import { asNumber, confidenceBucket, fetchJson, isoDate, nowIso, safeArray } from './utils.js'
import { assertWhitelisted, getWhitelistedSources } from './source_whitelist.js'

let secTickerCache = null
let secTickerCacheAt = 0

async function loadSecTickers() {
  const sources = getWhitelistedSources()
  const url = 'https://www.sec.gov/files/company_tickers.json'
  assertWhitelisted(url, 'sec company tickers')
  if (secTickerCache && Date.now() - secTickerCacheAt < 6 * 60 * 60 * 1000) return secTickerCache
  const data = await fetchJson(url, {
    timeoutMs: 20000,
    headers: {
      'User-Agent': 'Mission Control Dana Research dana@local',
      'Accept': 'application/json',
    },
  })
  const rows = Object.values(data || {}).map((row) => ({
    cik: String(row.cik_str || row.cik || '').padStart(10, '0'),
    ticker: String(row.ticker || '').toUpperCase(),
    title: String(row.title || ''),
  }))
  secTickerCache = rows
  secTickerCacheAt = Date.now()
  return rows
}

function latestFact(series = []) {
  const filtered = safeArray(series)
    .map((item) => ({ ...item, val: asNumber(item?.val, null), fy: asNumber(item?.fy, null), fp: item?.fp || '', form: item?.form || '', filed: item?.filed || '' }))
    .filter((item) => item.val !== null)
  if (!filtered.length) return null
  filtered.sort((a, b) => String(b.filed || '').localeCompare(String(a.filed || '')) || String(b.fy || '').localeCompare(String(a.fy || '')))
  return filtered[0]
}

function companyFactsMetrics(facts) {
  const gaap = facts?.facts?.['us-gaap'] || facts?.facts?.us_gaap || facts?.us_gaap || {}
  const pick = (...names) => {
    for (const name of names) {
      const concept = gaap[name]
      const units = Object.values(concept?.units || {}).flat()
      const latest = latestFact(units)
      if (latest) return latest
    }
    return null
  }
  const revenue = pick('Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerExcludingAssessedTax')
  const grossProfit = pick('GrossProfit')
  const operatingIncome = pick('OperatingIncomeLoss')
  const netIncome = pick('NetIncomeLoss')
  const currentAssets = pick('AssetsCurrent')
  const currentLiabilities = pick('LiabilitiesCurrent')
  const cash = pick('CashAndCashEquivalentsAtCarryingValue')
  const debt = pick('LongTermDebtAndFinanceLeaseObligations', 'LongTermDebtNoncurrent', 'LongTermDebt')
  const fcf = pick('NetCashProvidedByUsedInOperatingActivities')
  const shares = pick('WeightedAverageNumberOfDilutedSharesOutstanding', 'WeightedAverageNumberOfSharesOutstandingBasic')
  const operatingCash = pick('NetCashProvidedByUsedInOperatingActivities')
  return {
    revenue,
    grossProfit,
    operatingIncome,
    netIncome,
    currentAssets,
    currentLiabilities,
    cash,
    debt,
    fcf,
    shares,
    operatingCash,
  }
}

function metricsToAnalysis(metrics) {
  const revenue = metrics.revenue?.val ?? null
  const grossProfit = metrics.grossProfit?.val ?? null
  const operatingIncome = metrics.operatingIncome?.val ?? null
  const netIncome = metrics.netIncome?.val ?? null
  const currentAssets = metrics.currentAssets?.val ?? null
  const currentLiabilities = metrics.currentLiabilities?.val ?? null
  const cash = metrics.cash?.val ?? null
  const debt = metrics.debt?.val ?? null
  const fcf = metrics.fcf?.val ?? null
  const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null
  const grossMargin = revenue && grossProfit ? grossProfit / revenue : null
  const operatingMargin = revenue && operatingIncome ? operatingIncome / revenue : null
  const netMargin = revenue && netIncome ? netIncome / revenue : null
  const debtToCash = cash && debt ? debt / cash : null
  const cashCoverage = debt && cash ? cash / debt : null
  return {
    revenue,
    grossProfit,
    operatingIncome,
    netIncome,
    currentAssets,
    currentLiabilities,
    cash,
    debt,
    fcf,
    currentRatio,
    grossMargin,
    operatingMargin,
    netMargin,
    debtToCash,
    cashCoverage,
  }
}

function qualityBucket(completeness, sourceCount) {
  const score = Math.max(0, Math.min(100, completeness + Math.min(20, sourceCount * 6)))
  return score >= 80 ? 'High' : score >= 55 ? 'Medium' : 'Low'
}

async function fetchQuoteSummary(symbol) {
  const url = new URL(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`)
  url.searchParams.set('modules', 'assetProfile,price,summaryDetail,defaultKeyStatistics,financialData,calendarEvents')
  assertWhitelisted(url.toString(), `yahoo quoteSummary ${symbol}`)
  const data = await fetchJson(url.toString(), { timeoutMs: 15000 })
  return data?.quoteSummary?.result?.[0] || null
}

async function fetchYahooNews(symbol) {
  const url = new URL('https://query1.finance.yahoo.com/v2/finance/news')
  url.searchParams.set('symbols', symbol)
  assertWhitelisted(url.toString(), `yahoo news ${symbol}`)
  const data = await fetchJson(url.toString(), { timeoutMs: 12000 })
  return safeArray(data?.content?.result || data?.news || data?.items)
}

async function fetchSecSubmissions(cik) {
  if (!cik) return null
  const url = `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, '0')}.json`
  assertWhitelisted(url, `sec submissions ${cik}`)
  return fetchJson(url, {
    timeoutMs: 20000,
    headers: { 'User-Agent': 'Mission Control Dana Research dana@local' },
  })
}

export async function ingestCandidate(rawCandidate, options = {}) {
  const cfg = getDanaConfig()
  const candidate = createCanonicalCandidate({
    ...rawCandidate,
    validationSources: rawCandidate.validationSources || {},
  })
  const symbol = String(candidate.ticker || '').toUpperCase()
  const sources = getWhitelistedSources()
  const evidence = {}
  const usedSources = []

  if (!symbol) return createCanonicalCandidate({ ...candidate, dataQuality: 'Low', evidence, sources: usedSources })

  let tickerRow = null
  try {
    const tickerRows = await loadSecTickers()
    tickerRow = tickerRows.find((row) => row.ticker === symbol) || null
    if (tickerRow) {
      candidate.companyName = candidate.companyName || tickerRow.title
      candidate.sources.push('sec:company_tickers')
      usedSources.push('sec:company_tickers')
      evidence.secTicker = createFieldEvidence(tickerRow, 'sec:company_tickers', 'SEC ticker lookup', 1)
    }
  } catch (error) {
    evidence.secTickerError = createFieldEvidence(null, 'sec:company_tickers', error.message, 0)
  }

  try {
    if (sources.yahooQuoteSummary?.enabled) {
      const profile = await fetchQuoteSummary(symbol)
      const price = profile?.price || {}
      const summaryDetail = profile?.summaryDetail || {}
      const assetProfile = profile?.assetProfile || {}
      const financialData = profile?.financialData || {}
      candidate.companyName = candidate.companyName || price.longName || price.shortName || assetProfile.longBusinessSummary || candidate.companyName
      candidate.sector = candidate.sector || assetProfile.sector || assetProfile.industry || ''
      candidate.industry = candidate.industry || assetProfile.industry || ''
      candidate.exchange = candidate.exchange || price.exchange || ''
      candidate.fullExchangeName = candidate.fullExchangeName || price.fullExchangeName || ''
      candidate.marketState = candidate.marketState || price.marketState || ''
      candidate.currentPrice = candidate.currentPrice ?? asNumber(price.regularMarketPrice?.raw ?? price.regularMarketPrice)
      candidate.price = candidate.price ?? candidate.currentPrice
      candidate.sharesOutstanding = candidate.sharesOutstanding ?? asNumber(price.sharesOutstanding?.raw ?? price.sharesOutstanding)
      candidate.low52w = candidate.low52w ?? asNumber(summaryDetail.fiftyTwoWeekLow?.raw ?? summaryDetail.fiftyTwoWeekLow)
      candidate.high52w = candidate.high52w ?? asNumber(summaryDetail.fiftyTwoWeekHigh?.raw ?? summaryDetail.fiftyTwoWeekHigh)
      candidate.marketCap = candidate.marketCap ?? asNumber(summaryDetail.marketCap?.raw ?? summaryDetail.marketCap)
      candidate.overview = {
        longBusinessSummary: assetProfile.longBusinessSummary || '',
        sector: assetProfile.sector || '',
        industry: assetProfile.industry || '',
        website: assetProfile.website || '',
        fullTimeEmployees: assetProfile.fullTimeEmployees || null,
        beta: asNumber(summaryDetail.beta?.raw ?? summaryDetail.beta),
        trailingPE: asNumber(summaryDetail.trailingPE?.raw ?? summaryDetail.trailingPE),
        forwardPE: asNumber(summaryDetail.forwardPE?.raw ?? summaryDetail.forwardPE),
        priceToSalesTrailing12Months: asNumber(summaryDetail.priceToSalesTrailing12Months?.raw ?? summaryDetail.priceToSalesTrailing12Months),
        shortRatio: asNumber(summaryDetail.shortRatio?.raw ?? summaryDetail.shortRatio),
        earningsQuarterlyGrowth: asNumber(financialData.earningsQuarterlyGrowth?.raw ?? financialData.earningsQuarterlyGrowth),
        revenueGrowth: asNumber(financialData.revenueGrowth?.raw ?? financialData.revenueGrowth),
        grossMargins: asNumber(financialData.grossMargins?.raw ?? financialData.grossMargins),
        operatingMargins: asNumber(financialData.operatingMargins?.raw ?? financialData.operatingMargins),
        currentRatio: asNumber(financialData.currentRatio?.raw ?? financialData.currentRatio),
        debtToEquity: asNumber(financialData.debtToEquity?.raw ?? financialData.debtToEquity),
        freeCashflow: asNumber(financialData.freeCashflow?.raw ?? financialData.freeCashflow),
      }
      candidate.validationSources = {
        ...(candidate.validationSources || {}),
        secTicker: tickerRow ? {
          cik: tickerRow.cik,
          ticker: tickerRow.ticker,
          title: tickerRow.title,
        } : (candidate.validationSources?.secTicker || null),
        yahooQuoteSummary: {
          price: candidate.currentPrice ?? asNumber(price.regularMarketPrice?.raw ?? price.regularMarketPrice),
          currentPrice: candidate.currentPrice ?? asNumber(price.regularMarketPrice?.raw ?? price.regularMarketPrice),
          marketCap: asNumber(summaryDetail.marketCap?.raw ?? summaryDetail.marketCap),
          sharesOutstanding: asNumber(price.sharesOutstanding?.raw ?? price.sharesOutstanding),
          currentRatio: asNumber(financialData.currentRatio?.raw ?? financialData.currentRatio),
          debtToEquity: asNumber(financialData.debtToEquity?.raw ?? financialData.debtToEquity),
          revenueGrowth: asNumber(financialData.revenueGrowth?.raw ?? financialData.revenueGrowth),
          grossMargins: asNumber(financialData.grossMargins?.raw ?? financialData.grossMargins),
          operatingMargins: asNumber(financialData.operatingMargins?.raw ?? financialData.operatingMargins),
          freeCashflow: asNumber(financialData.freeCashflow?.raw ?? financialData.freeCashflow),
          exchange: price.exchange || '',
          fullExchangeName: price.fullExchangeName || '',
          marketState: price.marketState || '',
        },
      }
      candidate.sources.push('yahoo:quoteSummary')
      usedSources.push('yahoo:quoteSummary')
      evidence.profile = createFieldEvidence(profile, 'yahoo:quoteSummary', 'company profile + financial snapshot', 1)
    }
  } catch (error) {
    evidence.profileError = createFieldEvidence(null, 'yahoo:quoteSummary', error.message, 0)
  }

  try {
    if (tickerRow && sources.secSubmissions?.enabled) {
      const submissions = await fetchSecSubmissions(tickerRow.cik)
      candidate.filings = safeArray(submissions?.filings?.recent?.form).slice(0, 12).map((form, index) => ({
        form,
        filingDate: submissions?.filings?.recent?.filingDate?.[index] || null,
        reportDate: submissions?.filings?.recent?.reportDate?.[index] || null,
        accessionNumber: submissions?.filings?.recent?.accessionNumber?.[index] || null,
      }))
      candidate.sources.push('sec:submissions')
      usedSources.push('sec:submissions')
      evidence.submissions = createFieldEvidence(submissions, 'sec:submissions', 'recent SEC filings', 1)
      candidate.validationSources = {
        ...(candidate.validationSources || {}),
        secSubmissions: {
          name: submissions?.name || '',
          tickers: safeArray(submissions?.tickers || []),
          exchanges: safeArray(submissions?.exchanges || []),
          sicDescription: submissions?.sicDescription || '',
          entityType: submissions?.entityType || '',
        },
      }
      if (!candidate.fullExchangeName && safeArray(submissions?.exchanges || []).length) {
        candidate.fullExchangeName = safeArray(submissions?.exchanges || [])[0] || candidate.fullExchangeName
      }
    }
  } catch (error) {
    evidence.submissionsError = createFieldEvidence(null, 'sec:submissions', error.message, 0)
  }

  try {
    if (sources.yahooNews?.enabled) {
      const news = await fetchYahooNews(symbol)
      candidate.news = news.slice(0, 8).map((item) => ({
        title: item.title || item.headline || '',
        link: item.link || item.url || '',
        publisher: item.publisher || item.source || '',
        publishedAt: item.providerPublishTime || item.published_at || item.pubDate || null,
      }))
      if (candidate.news.length) usedSources.push('yahoo:news')
      evidence.news = createFieldEvidence(candidate.news, 'yahoo:news', 'recent news items', candidate.news.length ? 1 : 0.5)
    }
  } catch (error) {
    evidence.newsError = createFieldEvidence([], 'yahoo:news', error.message, 0)
  }

  try {
    const factsUrl = tickerRow?.cik ? `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(tickerRow.cik).padStart(10, '0')}.json` : null
    if (factsUrl && sources.secCompanyFacts?.enabled) {
      assertWhitelisted(factsUrl, `sec companyfacts ${symbol}`)
      const facts = await fetchJson(factsUrl, { timeoutMs: 20000, headers: { 'User-Agent': 'Mission Control Dana Research dana@local' } })
      const metrics = metricsToAnalysis(companyFactsMetrics(facts))
      candidate.financials = {
        ...candidate.financials,
        ...metrics,
      }
      candidate.annualRevenue = candidate.annualRevenue ?? asNumber(metrics.revenue)
      candidate.netIncome = candidate.netIncome ?? asNumber(metrics.netIncome)
      candidate.cashFlow = candidate.cashFlow ?? asNumber(metrics.fcf ?? metrics.operatingCash)
      candidate.otc_flag = Boolean(candidate.otc_flag ?? candidate.otcLike)
      candidate.financials.debtToEquity = candidate.financials.debtToEquity ?? asNumber(candidate.overview?.debtToEquity)
      candidate.eps = candidate.eps ?? asNumber(candidate.overview?.trailingPE ? candidate.price / candidate.overview.trailingPE : null)
      candidate.balanceSheetRisk = candidate.balanceSheetRisk ?? (metrics.currentRatio && metrics.currentRatio < 1 ? 'weak' : 'acceptable')
      candidate.sources.push('sec:companyfacts')
      usedSources.push('sec:companyfacts')
      evidence.companyFacts = createFieldEvidence(metrics, 'sec:companyfacts', 'SEC financial facts', 1)
      candidate.validationSources = {
        ...(candidate.validationSources || {}),
        secCompanyFacts: {
          revenue: metrics.revenue,
          grossProfit: metrics.grossProfit,
          operatingIncome: metrics.operatingIncome,
          netIncome: metrics.netIncome,
          currentAssets: metrics.currentAssets,
          currentLiabilities: metrics.currentLiabilities,
          cash: metrics.cash,
          debt: metrics.debt,
          fcf: metrics.fcf,
          currentRatio: metrics.currentRatio,
          grossMargin: metrics.grossMargin,
          operatingMargin: metrics.operatingMargin,
          netMargin: metrics.netMargin,
          debtToCash: metrics.debtToCash,
          cashCoverage: metrics.cashCoverage,
          sharesOutstanding: metrics.shares,
        },
      }
    }
  } catch (error) {
    evidence.companyFactsError = createFieldEvidence(null, 'sec:companyfacts', error.message, 0)
  }

  const completenessFields = [candidate.companyName, candidate.sector, candidate.price, candidate.volume, candidate.averageVolume, candidate.relativeVolume, candidate.dailyMovePct, candidate.overview?.longBusinessSummary, candidate.financials?.revenue, candidate.financials?.currentRatio, candidate.news?.length, candidate.filings?.length]
  const populated = completenessFields.filter((value) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && !value.length)).length
  const completeness = Math.round((populated / completenessFields.length) * 100)
  candidate.dataCompleteness = completeness
  candidate.dataQuality = qualityBucket(completeness, usedSources.length)
  candidate.sourceMeta = {
    ingestedAt: nowIso(),
    sourceCount: usedSources.length,
    sources: usedSources,
    confidenceLevel: confidenceBucket(completeness),
    analysisDate: isoDate(),
    status: completeness >= 70 && usedSources.length >= 2 ? 'approved' : 'review',
  }
  candidate.sourceAudit = {
    approved: usedSources.length > 0,
    sourceCount: usedSources.length,
    sources: usedSources,
    rejectedSources: Object.keys(evidence).filter((key) => key.endsWith('Error')),
    confidenceLevel: confidenceBucket(completeness),
  }
  candidate.evidence = { ...candidate.evidence, ...evidence }
  return candidate
}

export async function ingestCandidates(candidates = [], options = {}) {
  const out = []
  for (const candidate of candidates) {
    out.push(await ingestCandidate(candidate, options))
  }
  return out
}
