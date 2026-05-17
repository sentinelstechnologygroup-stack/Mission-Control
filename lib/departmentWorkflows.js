import { DEPARTMENTS } from './controlPlaneData.js'

const WORKFLOW_RULES = {
  Nettie: {
    allowedTaskTypes: ['coordination', 'routing', 'status', 'reporting', 'approvals'],
    qaGates: ['nettie_final_assembly'],
    nextActionTemplate: 'Route work to the correct department workflow and track execution.',
    reportingOwner: 'Nettie',
  },
  Van: {
    allowedTaskTypes: ['code', 'build', 'ci', 'deployment-readiness', 'technical-planning'],
    qaGates: ['van_build_review', 'perry_security_review_if_required'],
    nextActionTemplate: 'Run repo scan, tests, build, and prepare deployment readiness evidence.',
    reportingOwner: 'Nettie',
  },
  Perry: {
    allowedTaskTypes: ['security', 'qa', 'risk', 'deployment', 'auth', 'secrets'],
    qaGates: ['perry_security_review'],
    nextActionTemplate: 'Review security, QA, auth, secrets, and deployment risks before approval.',
    reportingOwner: 'Nettie',
  },
  Torina: {
    allowedTaskTypes: ['writing', 'content', 'media', 'packaging', 'seo'],
    qaGates: ['torina_editorial_review', 'perry_client_facing_review_if_required'],
    nextActionTemplate: 'Draft and package content assets with review-ready metadata.',
    reportingOwner: 'Nettie',
  },
  Scribe: {
    allowedTaskTypes: ['blog', 'content', 'research-synthesis', 'internal-links', 'seo-metadata'],
    qaGates: ['torina_editorial_review', 'perry_client_facing_review_if_required'],
    nextActionTemplate: 'Generate draft content queue assets and hand off to Torina for review.',
    reportingOwner: 'Nettie',
  },
  Funboy: {
    allowedTaskTypes: ['opportunity-intake', 'signal-scan', 'research', 'ranking'],
    qaGates: ['funboy_signal_review', 'nettie_routing_review'],
    nextActionTemplate: 'Ingest opportunity signals and rank candidates for routing.',
    reportingOwner: 'Nettie',
  },
  Dana: {
    allowedTaskTypes: ['finance', 'reporting', 'roi', 'budget'],
    qaGates: ['dana_finance_review', 'patrick_publication_review_if_required'],
    nextActionTemplate: 'Generate finance/reporting packet with ROI and budget framing.',
    reportingOwner: 'Nettie',
  },
  Icky: {
    allowedTaskTypes: ['admin', 'records', 'process', 'follow-up'],
    qaGates: ['icky_records_review', 'nettie_coordination_review'],
    nextActionTemplate: 'Update admin records and process follow-through logs.',
    reportingOwner: 'Nettie',
  },
}

function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function classifyTaskType(task = '') {
  const text = normalizeText(task)
  if (/\b(ci|test|build|lint|typecheck|repo|code|debug|deploy|deployment)\b/.test(text)) return 'code'
  if (/\b(blog|content|article|seo|media|draft|writing)\b/.test(text)) return 'writing'
  if (/\b(security|qa|risk|auth|secret|secrets)\b/.test(text)) return 'security'
  if (/\b(opportunity|lead|signal|scan|research)\b/.test(text)) return 'research'
  if (/\b(finance|budget|roi|report)\b/.test(text)) return 'finance'
  if (/\b(admin|record|records|process|follow up|follow-up)\b/.test(text)) return 'admin'
  return 'ops'
}

export function getDepartmentWorkflowRules(owner = '') {
  return WORKFLOW_RULES[String(owner || '').trim()] || {
    allowedTaskTypes: ['ops'],
    qaGates: ['nettie_final_assembly'],
    nextActionTemplate: 'Review and route through Nettie for the next governed step.',
    reportingOwner: 'Nettie',
  }
}

export function buildDepartmentWorkflowRegistry() {
  const departments = []
  for (const dept of DEPARTMENTS) {
    const rules = getDepartmentWorkflowRules(dept.name)
    departments.push({
      owner: dept.name,
      roleTitle: dept.title,
      domain: dept.domain,
      allowedTaskTypes: rules.allowedTaskTypes,
      qaGates: rules.qaGates,
      reportingOwner: rules.reportingOwner,
      nextActionTemplate: rules.nextActionTemplate,
    })
  }
  for (const extra of ['Scribe', 'Funboy', 'Icky']) {
    if (!departments.find((item) => item.owner === extra)) {
      const rules = getDepartmentWorkflowRules(extra)
      departments.push({
        owner: extra,
        roleTitle: `${extra} workflow`,
        domain: `${extra} operations`,
        allowedTaskTypes: rules.allowedTaskTypes,
        qaGates: rules.qaGates,
        reportingOwner: rules.reportingOwner,
        nextActionTemplate: rules.nextActionTemplate,
      })
    }
  }
  return { generatedAt: new Date().toISOString(), departments }
}

export function buildDepartmentWorkflow(owner = '', task = '', reviewChain = []) {
  const rules = getDepartmentWorkflowRules(owner)
  return {
    department: owner,
    taskType: classifyTaskType(task),
    nextAction: rules.nextActionTemplate,
    qaGate: rules.qaGates.join(' -> '),
    reportingOwner: rules.reportingOwner,
    reviewChain,
  }
}
