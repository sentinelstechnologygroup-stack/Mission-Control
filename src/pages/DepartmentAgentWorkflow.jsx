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

  const { data: recentJobs = [] } = useQuery({
    queryKey: ['jobs', 'recent'],
    queryFn: () => api.jobsRecent(25),
    refetchInterval: 10000,
  })

  const { data: workflowExecutions = [] } = useQuery({
    queryKey: ['workflows', 'executions', canonicalDepartmentId, canonicalAgentId],
    queryFn: () => api.workflowExecutions(50),
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

  const activePacket = useMemo(() => {
    const packets = []
    const collect = (job) => {
      const owner = normalizeId(job.owner || job.department || job.assignedDepartmentHead || job.agent || job.assignedAgent || '')
      const status = String(job.status || '').toLowerCase()
      if (owner === canonicalAgentId && ['queued', 'running', 'active', 'blocked', 'paused', 'in_progress'].includes(status)) packets.push(job)
    }
    ;(Array.isArray(workflowExecutions) ? workflowExecutions : []).forEach((execution) => {
      collect({
        jobId: execution.jobId || execution.executionId,
        id: execution.jobId || execution.executionId,
        task: execution.title || execution.workflowName || 'Live packet',
        title: execution.title || execution.workflowName || 'Live packet',
        owner: execution.agent || execution.assignedAgent || execution.departmentHead || execution.assignedDepartmentHead || '',
        department: execution.departmentHead || execution.assignedDepartmentHead || '',
        assignedDepartmentHead: execution.departmentHead || execution.assignedDepartmentHead || '',
        assignedAgent: execution.agent || execution.assignedAgent || '',
        status: execution.status || 'queued',
        routeStatus: execution.routeStatus || execution.currentStep || 'packet',
        executionMode: execution.executionMode || 'MC_NATIVE',
        updatedAt: execution.updatedAt,
        evidence: execution.evidence || execution.evidenceLogs || [],
        blockers: execution.blockers || [],
        logs: execution.logs || execution.history || [],
      })
    })
    ;(Array.isArray(recentJobs) ? recentJobs : []).forEach(collect)
    return packets[0] || null
  }, [canonicalAgentId, recentJobs, workflowExecutions])

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
    if (activePacket?.logs?.length) {
      return activePacket.logs.slice(0, 5).map((entry, index) => ({
        id: entry.id || `${activePacket.jobId || activePacket.id || 'live-packet'}-${index}`,
        message: entry.message || entry.text || entry.label || 'Execution event',
        status: entry.status || activePacket.status || 'queued',
        at: entry.at || activePacket.updatedAt,
        step: entry.step || entry.type || activePacket.routeStatus || 'packet',
      }))
    }
    if (activePacket) {
      return [{ id: activePacket.jobId || activePacket.id || 'live-packet', message: activePacket.task || activePacket.title || 'Live packet', status: activePacket.status || 'queued', at: activePacket.updatedAt, step: activePacket.routeStatus || activePacket.route || 'packet' }]
    }
    return [{ id: 'no-live-job', message: 'No active execution.', status: 'unavailable', at: null, step: 'registry' }]
  }, [activePacket, department?.activeWorkflowRuns])

  const evidenceItems = useMemo(() => {
    const items = asArray(department?.evidenceLogs).slice(0, 6).map((item) => ({
      id: item.id,
      label: item.summary || item.message || 'Evidence',
      detail: item.summary || item.message || 'Evidence captured',
      status: item.truthStatus || 'LIVE',
      at: item.at,
    }))
    if (activePacket?.blockers?.length) {
      items.unshift({
        id: `${activePacket.jobId || activePacket.id || 'live-packet'}-blockers`,
        label: 'Active blockers',
        detail: activePacket.blockers.map((blocker) => blocker.reason || blocker.message || blocker).join(' · '),
        status: 'BLOCKED',
        at: activePacket.updatedAt,
      })
    }
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
  }, [department?.evidenceLogs, agent, agentName, agentTruthLabel, activePacket])

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

      {activePacket && (
        <SectionCard title="Live packet" subtitle="The current execution record attached to this desk.">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/20">Packet</p>
              <p className="mt-1 text-[11px] text-white/70">{activePacket.jobId || activePacket.id || '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/20">Mode</p>
              <p className="mt-1 text-[11px] text-white/70">{activePacket.executionMode || 'MC_NATIVE'}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/20">Route</p>
              <p className="mt-1 text-[11px] text-white/70">{activePacket.routeStatus || activePacket.route || 'packet'}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[8px] uppercase tracking-wider text-white/20">Status</p>
              <p className="mt-1 text-[11px] text-white/70">{activePacket.status || 'queued'}</p>
            </div>
          </div>
          {activePacket.blockers?.length ? <p className="mt-3 text-[11px] text-rose-200">Blockers: {activePacket.blockers.map((blocker) => blocker.reason || blocker.message || blocker).join(' · ')}</p> : null}
        </SectionCard>
      )}

      {((department?.activeWorkflowRuns?.length || activePacket) && (
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
      )) || (
        <SectionCard title="Workflow canvas" subtitle="No live execution yet.">
          <p className="text-[11px] text-white/40">No active execution.</p>
        </SectionCard>
      )}

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
