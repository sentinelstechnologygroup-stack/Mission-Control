import fs from 'fs'
import path from 'path'
import { getDanaConfig } from '../config/index.js'
import { reportPackRoot } from '../config/paths.js'
import { ensureDir, pathForRun, readJson, runtimePath, writeJson } from '../agents/research/utils.js'

const GOVERNANCE_ROOT = runtimePath('governance')
const MODEL_CHANGE_LOG_PATH = path.join(GOVERNANCE_ROOT, 'model_change_log.json')
const SIMULATION_ASSUMPTION_LOG_PATH = path.join(GOVERNANCE_ROOT, 'simulation_assumption_log.json')

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

function now() {
  return new Date().toISOString()
}

export function ensureGovernanceStores() {
  ensureDir(GOVERNANCE_ROOT)
  if (!fileExists(MODEL_CHANGE_LOG_PATH)) {
    writeJson(MODEL_CHANGE_LOG_PATH, {
      schema_version: 1,
      artifact_type: 'model_change_log',
      required_fields: [
        'prior_model_version',
        'new_model_version',
        'change_summary',
        'reason',
        'evidence_basis',
        'scope',
        'changed_at',
        'changed_by',
      ],
      enforcement_rule: 'No model-tightening path may proceed without a record containing all required fields.',
      records: [],
      createdAt: now(),
      updatedAt: now(),
    })
  }
  if (!fileExists(SIMULATION_ASSUMPTION_LOG_PATH)) {
    writeJson(SIMULATION_ASSUMPTION_LOG_PATH, {
      schema_version: 1,
      artifact_type: 'simulation_assumption_log',
      required_fields: [
        'setup_selected',
        'structure_selected',
        'alternate_structure_compared',
        'assumptions',
        'no_trade_cases',
        'outcomes_logged',
        'fit_assessment',
        'run_id',
        'created_at',
      ],
      enforcement_rule: 'No simulation path may proceed without a record containing all required fields.',
      records: [],
      createdAt: now(),
      updatedAt: now(),
    })
  }
  return {
    governanceRoot: GOVERNANCE_ROOT,
    modelChangeLogPath: MODEL_CHANGE_LOG_PATH,
    simulationAssumptionLogPath: SIMULATION_ASSUMPTION_LOG_PATH,
  }
}

function appendRecord(storePath, record) {
  const store = readJson(storePath, null)
  if (!store || !Array.isArray(store.records)) {
    throw new Error(`Governance store missing or invalid: ${storePath}`)
  }
  store.records.push(record)
  store.updatedAt = now()
  writeJson(storePath, store)
  return storePath
}

export function logModelChange(record = {}) {
  ensureGovernanceStores()
  const required = [
    'prior_model_version',
    'new_model_version',
    'change_summary',
    'reason',
    'evidence_basis',
    'scope',
    'changed_at',
    'changed_by',
  ]
  const missing = required.filter((field) => record[field] === undefined || record[field] === null || record[field] === '')
  if (missing.length) {
    throw new Error(`Model change log missing required fields: ${missing.join(', ')}`)
  }
  appendRecord(MODEL_CHANGE_LOG_PATH, record)
  return MODEL_CHANGE_LOG_PATH
}

export function logSimulationAssumption(record = {}) {
  ensureGovernanceStores()
  const required = [
    'setup_selected',
    'structure_selected',
    'alternate_structure_compared',
    'assumptions',
    'no_trade_cases',
    'outcomes_logged',
    'fit_assessment',
    'run_id',
    'created_at',
  ]
  const missing = required.filter((field) => record[field] === undefined || record[field] === null || record[field] === '')
  if (missing.length) {
    throw new Error(`Simulation assumption log missing required fields: ${missing.join(', ')}`)
  }
  appendRecord(SIMULATION_ASSUMPTION_LOG_PATH, record)
  return SIMULATION_ASSUMPTION_LOG_PATH
}

export function enforceCanonicalReportPack({ run, mode = 'weekly', markdownFiles = [], docxFiles = [], validation = null }) {
  const cfg = getDanaConfig()
  const expectedTemplates = mode === 'weekly' ? cfg.reporting.weeklyTemplates : cfg.reporting.dailyTemplates
  const missingTemplates = expectedTemplates.filter((name) => !fileExists(path.join(reportPackRoot, name)))
  if (missingTemplates.length) {
    throw new Error(`Canonical Dana report pack missing templates: ${missingTemplates.join(', ')}`)
  }
  const observedMarkdownNames = markdownFiles.map((file) => path.basename(file))
  const unexpectedMarkdown = observedMarkdownNames.filter((name) => !expectedTemplates.includes(name))
  if (unexpectedMarkdown.length) {
    throw new Error(`Unexpected report artifacts outside canonical pack: ${unexpectedMarkdown.join(', ')}`)
  }
  if (!fileExists(path.join(reportPackRoot, 'validate_dana_reports.py'))) {
    throw new Error(`Canonical Dana report validator missing under report pack: ${reportPackRoot}`)
  }
  const artifact = {
    run_id: run?.id || null,
    mode,
    checked_at: now(),
    report_pack_root: reportPackRoot,
    expected_templates: expectedTemplates,
    observed_markdown_files: markdownFiles,
    observed_docx_files: docxFiles,
    validator_path: path.join(reportPackRoot, 'validate_dana_reports.py'),
    validation_ok: validation?.ok === true,
    fallback_path_status: 'blocked_by_canonical_pack_enforcement',
    canonical_pack_used: true,
  }
  const outputPath = pathForRun(run.id, 'report_pack_enforcement.json')
  writeJson(outputPath, artifact)
  return { artifact, artifactPath: outputPath }
}

export function createWeeklyOperatingArtifact({ run, verificationRecords = [], selected = [], sendResult = null, reportArtifacts = null }) {
  const rejected = verificationRecords.filter((candidate) => candidate.verification_status === 'REJECTED')
  const lowConfidence = verificationRecords.filter((candidate) => candidate.verification_status === 'LOW_CONFIDENCE')
  const verified = verificationRecords.filter((candidate) => ['VERIFIED', 'VERIFIED_WITH_CAUTIONS'].includes(candidate.verification_status))
  const artifact = {
    run_id: run?.id || null,
    mode: run?.mode || 'weekly',
    created_at: now(),
    total_complete: selected.length,
    total_in_progress: 0,
    total_blocked: rejected.length,
    total_pending_qc: verificationRecords.length,
    total_replay_ready: 0,
    total_conditional: lowConfidence.length,
    total_excluded: rejected.length,
    total_replay_runs: 0,
    total_skipped_runs: 0,
    total_no_trade_outcomes: 0,
    total_simulation_runs: 0,
    current_batch_in_progress: run?.id || null,
    sectors_completed: [...new Set(selected.map((candidate) => candidate.sector).filter(Boolean))],
    biggest_blockers: rejected.slice(0, 3).map((candidate) => ({
      ticker: candidate.ticker,
      reasons: candidate.rejection_reasons || [],
    })),
    biggest_data_integrity_risks: lowConfidence.slice(0, 3).map((candidate) => ({
      ticker: candidate.ticker,
      risk_annotation: candidate.risk_annotation || 'LOW_CONFIDENCE',
    })),
    biggest_process_risk: sendResult?.ok ? 'none_observed_in_send_path' : (sendResult?.attempted ? 'send_path_failure' : 'send_path_not_attempted'),
    verification_summary: {
      total: verificationRecords.length,
      verified: verified.length,
      low_confidence: lowConfidence.length,
      rejected: rejected.length,
    },
    report_validation_ok: reportArtifacts?.validation?.ok === true,
    send_result: sendResult ? { attempted: Boolean(sendResult.attempted), ok: Boolean(sendResult.ok), mode: sendResult.mode || null } : null,
  }
  const outputPath = pathForRun(run.id, 'weekly_operating_report.json')
  writeJson(outputPath, artifact)
  return { artifact, artifactPath: outputPath }
}

export function createBlockerVisibilityArtifact({ run, verificationRecords = [] }) {
  const rejected = verificationRecords.filter((candidate) => candidate.verification_status === 'REJECTED')
  const status = rejected.length > 0 ? 'blockers_present_and_visible' : 'zero_blockers_verified'
  const artifact = {
    run_id: run?.id || null,
    checked_at: now(),
    blocker_visibility_status: status,
    rejected_count: rejected.length,
    blocked_candidates: rejected.map((candidate) => ({
      ticker: candidate.ticker,
      verification_status: candidate.verification_status,
      rejection_reasons: candidate.rejection_reasons || [],
      rejection_categories: candidate.rejection_categories || null,
    })),
    rule: 'If blockers exist, they must surface here. Blank blocker fields elsewhere do not count as proof of health.',
  }
  const outputPath = pathForRun(run.id, 'blocker_visibility.json')
  writeJson(outputPath, artifact)
  return { artifact, artifactPath: outputPath }
}

export function createVerificationLogArtifact({ run, checks = [], result = 'pass', blockers = [] }) {
  const artifact = {
    run_id: run?.id || null,
    created_at: now(),
    result,
    checks,
    blockers,
  }
  const outputPath = pathForRun(run.id, 'verification_log.json')
  writeJson(outputPath, artifact)
  return { artifact, artifactPath: outputPath }
}
