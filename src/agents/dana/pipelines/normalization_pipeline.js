import { createCanonicalCandidate } from '../agents/research/schemas.js'
import { asNumber, safeArray, normalizeText } from '../agents/research/utils.js'

export function normalizeCandidate(candidate = {}) {
  const normalized = createCanonicalCandidate(candidate)
  normalized.ticker = String(normalized.ticker || '').toUpperCase().trim()
  normalized.companyName = normalizeText(normalized.companyName)
  normalized.sector = normalizeText(normalized.sector)
  normalized.industry = normalizeText(normalized.industry)
  normalized.price = asNumber(normalized.price, normalized.price)
  normalized.volume = asNumber(normalized.volume, normalized.volume)
  normalized.averageVolume = asNumber(normalized.averageVolume, normalized.averageVolume)
  normalized.relativeVolume = asNumber(normalized.relativeVolume, normalized.relativeVolume)
  normalized.dailyMovePct = asNumber(normalized.dailyMovePct, normalized.dailyMovePct)
  normalized.liquidityMetric = asNumber(normalized.liquidityMetric, normalized.liquidityMetric)
  normalized.marketCap = asNumber(normalized.marketCap, normalized.marketCap)
  normalized.low52w = asNumber(normalized.low52w, normalized.low52w)
  normalized.high52w = asNumber(normalized.high52w, normalized.high52w)
  normalized.news = safeArray(normalized.news)
  normalized.filings = safeArray(normalized.filings)
  normalized.sources = safeArray(normalized.sources)
  normalized.initialScannerNotes = normalizeText(normalized.initialScannerNotes)
  normalized.normalizedAt = new Date().toISOString()
  normalized.researchMeta = {
    ...(normalized.researchMeta || {}),
    normalizedAt: normalized.normalizedAt,
    sourceCount: normalized.sources.length,
  }
  return normalized
}

export function normalizeCandidates(candidates = []) {
  return candidates.map(normalizeCandidate)
}
