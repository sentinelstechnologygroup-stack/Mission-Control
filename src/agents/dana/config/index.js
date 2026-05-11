import fs from 'fs'
import path from 'path'
import { danaRoot, projectRoot, reportPackRoot, danaRuntimeRoot, formattedReportTemplatesRoot } from './paths.js'

function loadJson(filePath, fallback = {}) {
  if (!fs.existsSync(filePath)) return fallback
  const text = fs.readFileSync(filePath, 'utf8').trim()
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Dana config must be JSON-compatible YAML. Failed to parse ${filePath}: ${error.message}`)
  }
}

const baseConfig = {
  job: {
    owner: 'Dana',
    analyst: "Dana / Dana's Team",
    emailTo: ['SentinelsTechnologyGroup@gmail.com', 'Patrick@SentinelsDesignLab.com'],
    emailSubjectPrefix: '[Dana]',
  },
  scan: {
    priceMin: 1,
    priceMax: 10,
    minAverageVolume: 250000,
    minRelativeVolume: 1.5,
    minDailyMovePct: 4,
    maxScreenerResultsPerSource: 100,
    maxCandidates: 12,
    newsWindowDays: 7,
    offline: false,
    universeLimit: 250,
  },
  validation: {
    minDataConfidence: 0.7,
    minSignalScore: 5,
    minSupportSignals: 2,
    maxFinalCandidates: 5,
    requireVolumeMomentumAlignment: true,
    historyLimit: 20,
    snapshotLimit: 8,
    allowedExchanges: ['NYSE', 'NASDAQ', 'AMEX'],
    minMarketCap: 250000000,
    minAverageVolume: 250000,
    maxNegativeCashFlow: -100000000,
    maxDebtRatio: 3,
    maxMissingCriticalFields: 1,
    priceDeviationThreshold: 0.07,
    marketCapDeviationThreshold: 0.15,
    lowConfidencePenalty: 0.8,
  },
  reporting: {
    reportPackRoot: reportPackRoot,
    runtimeRoot: danaRuntimeRoot,
    dailyTemplates: [
      'INV_Opportunity_Scorecard.md',
      'INV_Stock_Opportunity_Analysis.md',
      'INV_Scenario_Analysis.md',
      'INV_Pricing_Margin_Model.md',
      'INV_Capital_Deployment.md',
      'INV_Executive_Summary.md',
    ],
    weeklyTemplates: [
      'INV_Rollup.md',
      'INV_Executive_Summary.md',
      'INV_Opportunity_Scorecard.md',
    ],
  },
  email: {
    enabled: true,
    adapter: 'gmail-mail',
    attachArchive: true,
  },
}

const configFiles = {
  research: path.join(danaRoot, 'config', 'dana_research_config.yaml'),
  whitelist: path.join(danaRoot, 'config', 'source_whitelist.yaml'),
  weights: path.join(danaRoot, 'config', 'score_weights.yaml'),
}

let cached

export function getDanaConfig() {
  if (cached) return cached
  const research = loadJson(configFiles.research, {})
  const whitelist = loadJson(configFiles.whitelist, {})
  const weights = loadJson(configFiles.weights, {})
  cached = {
    ...baseConfig,
    ...research,
    job: { ...baseConfig.job, ...(research.job || {}) },
    scan: { ...baseConfig.scan, ...(research.scan || {}) },
    validation: { ...baseConfig.validation, ...(research.validation || {}) },
    reporting: { ...baseConfig.reporting, ...(research.reporting || {}) },
    email: { ...baseConfig.email, ...(research.email || {}) },
    whitelist,
    weights,
    paths: {
      projectRoot,
      danaRoot,
      reportPackRoot,
      formattedReportTemplatesRoot,
      runtimeRoot: danaRuntimeRoot,
    },
  }
  return cached
}

export function getDanaConfigPaths() {
  return {
    research: configFiles.research,
    whitelist: configFiles.whitelist,
    weights: configFiles.weights,
  }
}
