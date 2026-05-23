const REQUIRED_FINAL_REPORT_FIELDS = [
  'statusLabel',
  'localVerified',
  'liveVerified',
  'githubPushed',
  'deploymentRefreshed',
  'browserVerified',
  'apiVerified',
  'commitHash',
  'packetId',
  'executorUsed',
  'hermesUsed',
  'remainingBlockers',
  'whatIsNotVerified',
]

const DISALLOWED_STATUS_WORDS = /\b(done|fixed|working|live|verified|complete|deployed|autonomous)\b/i

export function validateFinalReport(report = {}) {
  const missingFields = REQUIRED_FINAL_REPORT_FIELDS.filter((field) => {
    const value = report[field]
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0 && field === 'remainingBlockers')
  })

  const liveVerified = report.liveVerified === true
  const browserVerified = report.browserVerified === true
  const apiVerified = report.apiVerified === true
  const githubPushed = report.githubPushed === true
  const deploymentRefreshed = report.deploymentRefreshed === true
  const hasRequiredTruth = liveVerified && browserVerified && apiVerified && githubPushed && deploymentRefreshed && missingFields.length === 0

  let statusLabel = String(report.statusLabel || '').trim().toUpperCase()
  if (!liveVerified) {
    statusLabel = 'BLOCKED LIVE'
  } else if (!hasRequiredTruth || DISALLOWED_STATUS_WORDS.test(statusLabel) && statusLabel !== 'VERIFIED LIVE') {
    statusLabel = 'PARTIAL'
  } else if (statusLabel !== 'VERIFIED LIVE') {
    statusLabel = 'PARTIAL'
  }

  const normalized = {
    ...report,
    statusLabel,
    remainingBlockers: Array.isArray(report.remainingBlockers) ? report.remainingBlockers : report.remainingBlockers ? [report.remainingBlockers] : [],
  }

  return {
    ok: hasRequiredTruth && statusLabel === 'VERIFIED LIVE',
    statusLabel,
    localVerified: report.localVerified === true,
    liveVerified,
    githubPushed,
    deploymentRefreshed,
    browserVerified,
    apiVerified,
    commitHash: report.commitHash || null,
    packetId: report.packetId || null,
    executorUsed: report.executorUsed || null,
    hermesUsed: report.hermesUsed === true,
    remainingBlockers: normalized.remainingBlockers,
    whatIsNotVerified: report.whatIsNotVerified || null,
    missingFields,
    normalized,
  }
}

export function deriveNettieTruth({
  runtimeState,
  executorStatus,
  packets,
  chatHistory,
  recentConversations,
  runtimeStateError,
  executorStatusError,
  packetsError,
  chatHistoryError,
  recentConversationsError,
  runtimeStateErrorDetail,
  executorStatusErrorDetail,
  packetsErrorDetail,
  chatHistoryErrorDetail,
  recentConversationsErrorDetail,
}) {
  const nettie = runtimeState?.nettie || runtimeState?.status?.nettie || runtimeState?.runtime?.nettie || {}
  const packetCreationAvailable = Array.isArray(packets)
  const historyAvailable = Array.isArray(chatHistory) || Array.isArray(recentConversations)
  const chatAvailable = Array.isArray(chatHistory)
  const status = String(nettie.status || '').toUpperCase()
  const errorDetails = [runtimeStateErrorDetail, executorStatusErrorDetail, packetsErrorDetail, chatHistoryErrorDetail, recentConversationsErrorDetail].filter(Boolean)
  const blockingError = errorDetails.find((err) => {
    const statusCode = Number(err?.status || err?.response?.status || 0)
    const message = String(err?.message || err?.error || err?.payload?.error || err?.payload?.reason || '').toLowerCase()
    if (statusCode === 401 || statusCode === 403) return false
    if (/missing_bridge_token|unauthorized|forbidden/.test(message) && statusCode === 0) return false
    return Boolean(err)
  })
  const executorAccessFailure = executorStatusErrorDetail
    ? (() => {
        const statusCode = Number(executorStatusErrorDetail?.status || executorStatusErrorDetail?.response?.status || 0)
        const message = String(executorStatusErrorDetail?.message || executorStatusErrorDetail?.error || executorStatusErrorDetail?.payload?.error || executorStatusErrorDetail?.payload?.reason || '').toLowerCase()
        return statusCode === 401 || statusCode === 403 || /missing_bridge_token|unauthorized|forbidden/.test(message)
      })()
    : false

  if (blockingError) {
    return {
      label: 'NETTIE BLOCKED',
      variant: 'critical',
      status: 'BLOCKED',
      detail: 'API/CORS/Access failure',
    }
  }

  if (status === 'ONLINE' || (chatAvailable && historyAvailable && packetCreationAvailable && runtimeState && executorStatus)) {
    return {
      label: 'NETTIE ONLINE',
      variant: 'active',
      status: 'ONLINE',
      detail: nettie.detail || 'chat, history, and packet creation available',
    }
  }

  if (executorAccessFailure || status === 'LIMITED' || chatAvailable || historyAvailable || packetCreationAvailable || !executorStatus || !runtimeState) {
    return {
      label: 'NETTIE LIMITED',
      variant: 'warning',
      status: 'LIMITED',
      detail: executorAccessFailure ? 'executor access token required' : (nettie.fallbackReason || executorStatus?.fallbackReason || 'runtime missing executor or full evidence'),
    }
  }

  return {
    label: 'NETTIE BLOCKED',
    variant: 'critical',
    status: 'BLOCKED',
    detail: 'runtime unavailable',
  }
}
