function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function detectNettieIntent(message = '') {
  const text = String(message || '').trim()
  const lower = normalizeText(text)

  if (!lower) return { intent: 'unknown', owner: null }

  const ownerMatch = lower.match(/\b(van|perry|torina|dana|ivy|funboy|rab|nettie)\b/)
  const owner = ownerMatch ? ({ ivy: 'Funboy', funboy: 'Funboy', van: 'Van', perry: 'Perry', torina: 'Torina', dana: 'Dana', rab: 'Rab', nettie: 'Nettie' }[ownerMatch[1]] || null) : null

  if (/\bdeploy|deployment|ship to production|publish live|go live\b/.test(lower)) return { intent: 'deployment_request', owner }
  if (/\bapprove|approval|sign off|authorize\b/.test(lower)) return { intent: 'approval_request', owner }
  if (/\bsecurity\b|\bperry review\b|\baudit\b/.test(lower)) return { intent: 'security_review', owner: owner || 'Perry' }
  if (/\bcost\b|\bbudget\b|\broi\b|\bpricing\b|\bfinance\b/.test(lower)) return { intent: 'cost_review', owner: owner || 'Dana' }
  if (/\btriage\b|\breconciliation\b|\boperational triage\b/.test(lower)) return { intent: 'triage_summary', owner }
  if (/\bsummar(i[sz]e|y)\b/.test(lower) && (/\bblocking\b/.test(lower) || /\bautonom(y|ous)\b/.test(lower) || /\bautonomy\b/.test(lower) || /\bmc autonomy\b/.test(lower) || /\bmission control autonomy\b/.test(lower) || /\bautonomous execution\b/.test(lower))) return { intent: 'triage_summary', owner }
  if (/\bwhat is blocking\b/.test(lower) && (/\bautonom(y|ous)\b/.test(lower) || /\bautonomy\b/.test(lower) || /\bexecution\b/.test(lower))) return { intent: 'triage_summary', owner }
  if (/\bruntime health\b|\bexecutor\b|\bcooldown\b|\bbridge\b|\bruntime\b/.test(lower)) return { intent: 'runtime_health', owner }
  if (/\breport\b|\breports\b/.test(lower) && /\bstale\b|\bfresh\b|\bsummary\b|\bstatus\b/.test(lower)) return { intent: 'report_status', owner }
  if (/\bstale jobs\b|\bstale queue\b|\bstale debt\b/.test(lower)) return { intent: 'stale_jobs', owner }
  if (/\bwhat is blocked\b|\bblocked jobs\b|\bblockers\b/.test(lower)) return { intent: 'blocked_jobs', owner }
  if (/\bqueue\b|\bqueued\b|\brunning\b/.test(lower) && /\bstatus\b|\bgive me\b|\bshow\b|\bwhat\b/.test(lower)) return { intent: 'queue_status', owner }
  if (lower === 'status' || /^status\b/.test(lower) || /\bbrief me\b/.test(lower)) return { intent: 'status', owner }
  if (/\bwhat should\b.+\bdo next\b/.test(lower) || /\bnext for\b/.test(lower)) return { intent: 'route_to_agent', owner }
  if (/^(have|ask|queue|route|send|make)\b/.test(lower) && owner) return { intent: 'route_to_agent', owner }
  if (/\bcreate task\b|\bcreate job\b|\binvestigate\b|\bwork on\b/.test(lower)) return { intent: 'create_task', owner }
  if (/^(fix it|fix this|repair it|patch it|update it|make it work|do it|handle it)$/i.test(lower)) return { intent: 'clarification_request', owner }
  if (/\bwho are you\b|\bwhat are you\b|\bwhat can you do\b|\btell me about yourself\b|\bhelp\b|\bhello\b|\bhey\b|\bhi\b|\bhow are you\b/.test(lower)) return { intent: 'general_chat', owner: 'Nettie' }

  return { intent: 'unknown', owner }
}
