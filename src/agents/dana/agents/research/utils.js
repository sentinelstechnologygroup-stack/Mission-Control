import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { ensureDanaDirs, resolveRuntimeDanaPath } from '../../config/paths.js'

export function nowIso() {
  return new Date().toISOString()
}

export function toDate(value) {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export function isoDate(value = new Date()) {
  return toDate(value).toISOString().slice(0, 10)
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function round(n, digits = 2) {
  const p = 10 ** digits
  return Math.round((Number(n) || 0) * p) / p
}

export function pct(n, digits = 1) {
  return `${round(n, digits)}%`
}

export function money(n, digits = 2) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `$${v.toFixed(digits)}`
}

export function int(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return Math.round(v).toLocaleString('en-US')
}

export function num(n, digits = 2) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item'
}

export function runId(prefix = 'dana') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return fallback
  }
}

export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

export function writeText(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
  return filePath
}

export function writeJson(filePath, value) {
  return writeText(filePath, JSON.stringify(value, null, 2))
}

export function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(value)}
`)
  return filePath
}

export function fileExists(filePath) {
  return fs.existsSync(filePath)
}

export function dedupeBy(items, keyFn) {
  const seen = new Set()
  const out = []
  for (const item of items || []) {
    const key = keyFn(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

export function mean(values) {
  const filtered = values.map(Number).filter(Number.isFinite)
  if (!filtered.length) return 0
  return filtered.reduce((a, b) => a + b, 0) / filtered.length
}

export function latestDate(a, b) {
  const da = new Date(a || 0).getTime()
  const db = new Date(b || 0).getTime()
  return da >= db ? a : b
}

export function normalizeText(value) {
  return String(value ?? '').trim()
}

export function safeArray(value) {
  return Array.isArray(value) ? value : []
}

export function lower(value) {
  return normalizeText(value).toLowerCase()
}

export function asNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function fromPercent(value) {
  const n = asNumber(value, null)
  return n === null ? null : n / 100
}

export async function fetchJson(url, { headers = {}, timeoutMs = 15000 } = {}) {
  if (typeof fetch !== 'function') throw new Error('global fetch is not available in this Node runtime')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`)
    }
    return text ? JSON.parse(text) : null
  } finally {
    clearTimeout(timer)
  }
}

export function safeJson(value, fallback = null) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function factorLabelFromScore(score) {
  if (score >= 8.5) return 'Strong'
  if (score >= 7) return 'Good'
  if (score >= 5.5) return 'Mixed'
  return 'Weak'
}

export function confidenceBucket(score) {
  if (score >= 80) return 'High'
  if (score >= 55) return 'Medium'
  return 'Low'
}

export function safeFilename(value) {
  return String(value || 'item').replace(/[^a-zA-Z0-9._-]+/g, '_')
}

export function runtimePath(...parts) {
  return resolveRuntimeDanaPath(...parts)
}

export function pathForRun(runIdValue, ...parts) {
  return resolveRuntimeDanaPath('runs', runIdValue, ...parts)
}

export function scoreToRating(score, bands = []) {
  const ordered = [...bands].sort((a, b) => b.min - a.min)
  return ordered.find((band) => score >= band.min)?.label || 'Pass'
}

export function summarizeReasons(items, limit = 3) {
  return safeArray(items).filter(Boolean).slice(0, limit)
}

export function estimateVolatility(changePct, relativeVolume = 1) {
  const move = Math.abs(asNumber(changePct, 0))
  const rv = asNumber(relativeVolume, 1)
  return clamp((move * 0.6) + (Math.max(0, rv - 1) * 1.4), 0, 10)
}

export function toArray(value) {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [value]
}

export function last(arr) {
  return arr && arr.length ? arr[arr.length - 1] : null
}

export function buildEvidence(value, source, note = '', confidence = 1) {
  return { value, source, note, confidence }
}

export function reportField(value, fallback = 'Not available') {
  if (value === null || value === undefined || value === '') return fallback
  return value
}

export function ensureDanaRuntime() {
  ensureDanaDirs()
}
