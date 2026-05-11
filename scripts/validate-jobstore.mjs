import * as jobStore from '../lib/jobStore.js'

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exitCode = 1
}

function ok(message) {
  console.log(`PASS: ${message}`)
}

const jobs = jobStore.loadJobs()
const ledger = jobStore.deriveLedgerView()
const registry = jobStore.deriveRegistryView()
const summary = jobStore.deriveStatusSummary()

const aliasA = jobStore.normalizeJobId('job_hermes-bridge')
const aliasB = jobStore.normalizeJobId('job_agent-routing')

if (aliasA !== 'job-hermes-bridge' && aliasA !== 'job_hermes-bridge') {
  fail(`job_hermes-bridge alias did not resolve correctly: ${aliasA}`)
} else {
  ok(`job_hermes-bridge alias resolved to ${aliasA}`)
}

if (aliasB !== 'job-agent-routing' && aliasB !== 'job_agent-routing') {
  fail(`job_agent-routing alias did not resolve correctly: ${aliasB}`)
} else {
  ok(`job_agent-routing alias resolved to ${aliasB}`)
}

const duplicate = jobStore.findDuplicateJob({ department: 'Hermes', task: 'test Hermes bridge' }, { includeClosed: true })
if (!duplicate) {
  fail('duplicate "test Hermes bridge" jobs were not detected')
} else {
  ok(`duplicate "test Hermes bridge" detected at ${duplicate.id}`)
}

if (!Array.isArray(ledger) || !Array.isArray(registry.running) || !Array.isArray(registry.queued)) {
  fail('ledger/registry derivations did not return arrays')
} else {
  ok('ledger and registry derivations returned arrays')
}

if (summary.total !== ledger.length) {
  fail(`status summary total ${summary.total} did not match ledger length ${ledger.length}`)
} else {
  ok(`status summary total matches ledger length (${ledger.length})`)
}

const runningFromSourceTypes = registry.running.reduce((acc, job) => {
  acc[job.sourceType || 'unknown'] = (acc[job.sourceType || 'unknown'] || 0) + 1
  return acc
}, {})
console.log(JSON.stringify({
  ledgerCount: ledger.length,
  registryCounts: {
    active: registry.active.length,
    queued: registry.queued.length,
    running: registry.running.length,
    paused: registry.paused.length,
    blocked: registry.blocked.length,
    completedRecent: registry.completedRecent.length,
  },
  runningFromSourceTypes,
}, null, 2))

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode)
}
