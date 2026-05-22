import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { truthLabel, truthVariant } from '@/lib/mcTruth'
import { LinkButton, PageHeader, SectionCard, SimpleTable } from '@/components/mission-control/LiveDataViews'
import AgentWorkflowCanvas from '@/components/departments/AgentWorkflowCanvas'

function normalizeId(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function asArray(value) {
  return Array.isArray(value) ? value : Object.values(value || {})
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function agentTruth(agent) {
  if (!agent) return 'UNAVAILABLE'
  if (String(agent?.heartbeat?.status || '').toLowerCase() === 'live' || ['available', 'active', 'idle', 'assigned'].includes(String(agent?.status || '').toLowerCase())) return 'LIVE'
  if (agent?.agentFilesystem?.complete || agent?.agentState?.complete) return 'REGISTRY-BACKED'
  if (agent?.seededAt || agent?.demoOnly) return 'SEEDED'
  return 'UNAVAILABLE'
}

function buildEdges(nodes = []) {
  return nodes.slice(0, -1).map((node, index) => ({
    id: `${node.id}-${nodes[index + 1].id}`,
    from: node.id,
    to: nodes[index + 1].id,
    kind: node.type === 'intake' && nodes[index + 1]?.type === 'agent' ? 'branch' : 'handoff',
  }))
}

function pickActiveNode(nodes = [], state = 'unavailable') {
  const lower = String(state || '').toLowerCase()
  if (['running', 'active'].includes(lower)) return nodes.find((node) => node.type === 'agent')?.id || nodes[0]?.id || null
  if (['blocked', 'failed'].includes(lower)) return nodes.find((node) => node.type === 'review')?.id || nodes[0]?.id || null
  if (['complete', 'completed', 'done'].includes(lower)) return nodes[nodes.length - 1]?.id || nodes[0]?.id || null
  return nodes.find((node) => node.type === 'intake')?.id || nodes[0]?.id || null
}

export default function DepartmentAgentWorkflowPage() {
  const { departmentId, agentId } = useParams()
  const canonicalDepartmentId = normalizeId(departmentId)
  const canonicalAgentId = normalizeId(agentId)

  const { data: workflowRegistry } = useQuery({
    queryKey: ['departments', 'workflows'],
    queryFn: api.departmentsWorkflows,
    refetchInterval: 10000,
  })

  const { data: registryAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: api.agents,
    refetchInterval: 10000,
  })

  const { data: selectedDepartment } = useQuery({
    queryKey: ['departments', departmentId],
    queryFn: () => api.department(departmentId),
    enabled: Boolean(departmentId),
    refetchInterval: 10000,
  })

  const department = workflowRegistry?.departments?.find((item) => normalizeId(item.id || item.name) === canonicalDepartmentId) || selectedDepartment || null
  const agent = asArray(registryAgents).find((item) => normalizeId(item.id || item.displayName) === canonicalAgentId || asArray(item.aliases).some((alias) => normalizeId(alias) === canonicalAgentId)) || null
  const agentName = agent?.displayName || agent?.id || agentId || 'Agent'
  const departmentName = department?.name || department?.title || departmentId || 'Department'
  const agentTruthLabel = agent ? agentTruth(agent) : 'REGISTRY-BACKED'

  const template = department?.workflowTemplates?.[0]?.nodeChain || [
    { id: 'trigger', type: 'trigger', label: `${agentName} packet`, status: 'waiting', owner: departmentName, detail: 'Packet enters the desk.' },
    { id: 'intake', type: 'intake', label: `${departmentName} intake`, status: 'waiting', owner: departmentName, detail: 'Registered and routed.' },
    { id: 'agent', type: 'agent', label: `${agentName} execution`, status: 'waiting', owner: agentName, detail: 'Desk execution step.' },
    { id: 'review', type: 'review', label: `${departmentName} review`, status: 'waiting', owner: departmentName, detail: 'Review before approval.' },
    { id: 'approval', type: 'approval', label: 'Approval gate', status: 'waiting', owner: 'Perry / Nettie', detail: 'Explicit approval step.' },
    { id: 'evidence', type: 'evidence', label: 'Evidence / output', status: 'waiting', owner: departmentName, detail: 'Output captured here.' },
    { id: 'completion', type: 'completion', label: 'Completion', status: 'waiting', owner: departmentName, detail: 'Workflow closed.' },
  ]

  const nodes = template.map((node, index) => ({
    ...node,
    status:
      index === 0 ? 'complete' :
      index === 2 ? (agentTruthLabel === 'LIVE' ? 'running' : 'waiting') :
      index === template.length - 1 ? 'waiting' :
      node.status || 'waiting',
  }))
  const edges = buildEdges(nodes)
  const activeNodeId = pickActiveNode(nodes, String(agent?.status || department?.truthStatus || 'unavailable'))

  const logItems = useMemo(() => {
    const jobs = asArray(department?.activeWorkflowRuns)
    if (jobs.length) {
      return jobs.slice(0, 5).map((job) => ({
        id: job.id,
        message: job.task,
        status: job.status,
        at: job.updatedAt,
        step: job.nextAction,
      }))
    }
    return [{ id: 'no-live-job', message: 'No live execution packet is attached to this desk.', status: 'unavailable', at: null, step: 'registry' }]
  }, [department?.activeWorkflowRuns])

  const evidenceItems = useMemo(() => {
    const items = asArray(department?.evidenceLogs).slice(0, 6).map((item) => ({
      id: item.id,
      label: item.summary || item.message || 'Evidence',
      detail: item.summary || item.message || 'Evidence captured',
      status: item.truthStatus || 'LIVE',
      at: item.at,
    }))
    if (agent) {
      items.unshift({
        id: `${agent.id}-registry`,
        label: `${agentName} registry record`,
        detail: agent.roleTitle || 'Registry-backed desk',
        status: agentTruthLabel,
        at: agent.updatedAt || agent.lastSeenAt,
      })
    }
    return items
  }, [department?.evidenceLogs, agent, agentName, agentTruthLabel])

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${agentName} workflow`}
        subtitle={`${departmentName} · ${truthLabel(agentTruthLabel).toUpperCase()}`}
        actions={(
          <>
            <LinkButton to={`/departments/${canonicalDepartmentId}`}>Back to floor</LinkButton>
            <LinkButton to="/departments">Departments</LinkButton>
          </>
        )}
      />

      <AgentWorkflowCanvas
        title="Workflow canvas"
        subtitle="Canvas first. Logs and evidence below."
        sourceLabel={agentTruthLabel}
        nodes={nodes}
        edges={edges}
        activeNodeId={activeNodeId}
        showSummary={false}
        showPanels={false}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Execution log" subtitle="Small, truthful log beneath the canvas.">
          <SimpleTable
            columns={[
              { key: 'message', label: 'Event' },
              { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-wider ${truthVariant(row.status) === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : truthVariant(row.status) === 'critical' ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : 'border-white/[0.08] bg-white/[0.03] text-white/55'}`}>{row.status}</span> },
              { key: 'step', label: 'Step' },
              { key: 'at', label: 'Updated' },
            ]}
            rows={logItems}
            empty="No live execution log yet"
          />
        </SectionCard>

        <SectionCard title="Evidence / output" subtitle="Small, truthful output panel beneath the canvas.">
          <SimpleTable
            columns={[
              { key: 'label', label: 'Item' },
              { key: 'detail', label: 'Detail' },
              { key: 'status', label: 'Truth', render: (row) => <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/55">{truthLabel(row.status).toUpperCase()}</span> },
            ]}
            rows={evidenceItems}
            empty="No live evidence/output captured yet"
          />
        </SectionCard>
      </div>
    </div>
  )
}
