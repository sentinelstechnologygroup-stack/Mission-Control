import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeftRight, BadgeCheck, Bot, FileText, GitBranch, Link2, MemoryStick, Workflow } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { truthLabel, truthVariant } from '@/lib/mcTruth'
import GlassCard from '@/components/mission-control/GlassCard'
import StatusBadge from '@/components/mission-control/StatusBadge'
import { LinkButton, PageHeader, SectionCard, SimpleTable } from '@/components/mission-control/LiveDataViews'
import AgentWorkflowCanvas from '@/components/departments/AgentWorkflowCanvas'

function normalizeId(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function asArray(value) {
  return Array.isArray(value) ? value : Object.values(value || {})
}

function formatCount(value) {
  if (value === null || value === undefined) return '—'
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : String(value)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function agentTruth(agent) {
  if (!agent) return 'UNAVAILABLE'
  if (String(agent?.heartbeat?.status || '').toLowerCase() === 'live' || ['available', 'active', 'idle', 'assigned'].includes(String(agent?.status || '').toLowerCase())) return 'LIVE'
  if (agent?.agentFilesystem?.complete || agent?.agentState?.complete) return 'REGISTRY-BACKED'
  if (agent?.seededAt || agent?.demoOnly) return 'SEEDED'
  return 'UNAVAILABLE'
}

function statusVariant(status = '') {
  const value = String(status || '').toLowerCase()
  if (['running', 'active', 'live', 'healthy', 'ready', 'available', 'complete', 'completed', 'done', 'success'].includes(value)) return 'active'
  if (['blocked', 'rejected', 'failed', 'error', 'critical', 'missing', 'unavailable'].includes(value)) return 'critical'
  if (['queued', 'pending', 'cooldown', 'warning', 'review', 'waiting', 'hold'].includes(value)) return 'warning'
  return 'idle'
}

function buildWorkflowNodes({ templateNodes = [], departmentName, agentName, selectedJob, liveStatus, selectedAgent }) {
  const template = templateNodes.length ? templateNodes : [
    { id: 'trigger', type: 'trigger', label: `New ${agentName} packet`, status: 'waiting' },
    { id: 'intake', type: 'intake', label: `${departmentName} intake`, status: 'waiting' },
    { id: 'agent', type: 'agent', label: `${agentName} execution`, status: 'waiting' },
    { id: 'review', type: 'review', label: `${departmentName} review`, status: 'waiting' },
    { id: 'approval', type: 'approval', label: 'Approval gate', status: 'waiting' },
    { id: 'evidence', type: 'evidence', label: 'Evidence / output', status: 'waiting' },
    { id: 'completion', type: 'completion', label: 'Completion', status: 'waiting' },
  ]

  const base = [
    {
      id: 'trigger',
      label: template[0]?.label || `New ${agentName} packet`,
      type: template[0]?.type || 'trigger',
      lane: 'main',
      column: 0,
      status: liveStatus === 'running' || liveStatus === 'active' ? 'running' : selectedJob ? 'complete' : 'waiting',
      detail: `Workflow entry point for ${agentName} within ${departmentName}.`,
      owner: departmentName,
      tool: 'Command intake',
    },
    {
      id: 'intake',
      label: template[1]?.label || `${departmentName} intake`,
      type: template[1]?.type || 'intake',
      lane: 'main',
      column: 1,
      status: liveStatus === 'running' || liveStatus === 'active' ? 'running' : selectedJob ? 'complete' : 'waiting',
      detail: 'Packet is registered and checked before it branches to tool/memory lanes.',
      owner: departmentName,
      tool: 'Registry intake',
    },
    {
      id: 'tool-branch',
      label: `${agentName} tool / API lane`,
      type: 'tool',
      lane: 'tooling',
      column: 2,
      status: selectedJob ? 'running' : (selectedAgent?.agentFilesystem?.complete ? 'waiting' : 'unavailable'),
      detail: 'Tool and API calls are surfaced explicitly as a branch.',
      owner: agentName,
      tool: 'Tool / API',
    },
    {
      id: 'memory-branch',
      label: `${agentName} memory / registry lane`,
      type: 'memory',
      lane: 'memory',
      column: 2,
      status: selectedJob ? 'running' : (selectedAgent?.agentState?.complete ? 'waiting' : 'unavailable'),
      detail: 'Memory and registry reads are exposed as a separate branch.',
      owner: agentName,
      tool: 'Memory / registry',
    },
    {
      id: 'agent',
      label: template[2]?.label || `${agentName} execution`,
      type: template[2]?.type || 'agent',
      lane: 'main',
      column: 3,
      status: liveStatus === 'running' || liveStatus === 'active' ? 'running' : selectedJob ? 'complete' : 'waiting',
      detail: `The ${agentName} office executes the packet and emits visible state transitions.`,
      owner: agentName,
      tool: selectedAgent?.roleTitle || 'Agent execution',
    },
    {
      id: 'review',
      label: template[3]?.label || `${departmentName} review`,
      type: template[3]?.type || 'review',
      lane: 'review',
      column: 4,
      status: liveStatus === 'blocked' || liveStatus === 'failed' ? 'blocked' : selectedJob ? 'running' : 'waiting',
      detail: 'Review and QA are visible as a dedicated gate before approval.',
      owner: departmentName,
      tool: 'Review gate',
    },
    {
      id: 'approval',
      label: template[4]?.label || 'Approval gate',
      type: template[4]?.type || 'approval',
      lane: 'main',
      column: 5,
      status: liveStatus === 'blocked' || liveStatus === 'failed' ? 'blocked' : selectedJob ? 'waiting' : 'waiting',
      detail: 'Approval remains an explicit node rather than hidden metadata.',
      owner: 'Perry / Nettie',
      tool: 'Approval gate',
    },
    {
      id: 'evidence',
      label: template[5]?.label || 'Evidence / output',
      type: template[5]?.type || 'evidence',
      lane: 'output',
      column: 6,
      status: selectedJob ? 'waiting' : 'waiting',
      detail: 'Evidence and output are visible on the canvas and in the side panel.',
      owner: departmentName,
      tool: 'Evidence drawer',
    },
    {
      id: 'completion',
      label: template[6]?.label || 'Completion',
      type: template[6]?.type || 'completion',
      lane: 'main',
      column: 7,
      status: liveStatus === 'complete' || selectedJob ? 'complete' : 'waiting',
      detail: 'Workflow completion and handoff are surfaced as the final node.',
      owner: departmentName,
      tool: 'Completion / handoff',
    },
  ]

  const activeIndex = liveStatus === 'running' || liveStatus === 'active' ? 4 : liveStatus === 'blocked' || liveStatus === 'failed' ? 5 : liveStatus === 'complete' ? 7 : 1

  return base.map((node, index) => ({
    ...node,
    status:
      liveStatus === 'blocked' || liveStatus === 'failed'
        ? (node.id === 'review' || node.id === 'approval' ? 'blocked' : index < 4 ? 'complete' : 'waiting')
        : liveStatus === 'complete'
          ? (index <= activeIndex ? 'complete' : 'waiting')
          : liveStatus === 'running' || liveStatus === 'active'
            ? (index < activeIndex ? 'complete' : index === activeIndex ? 'running' : 'waiting')
            : node.status,
  }))
}

function buildWorkflowEdges(nodes = []) {
  const lookup = new Map(nodes.map((node) => [node.id, node]))
  const edgePairs = [
    ['trigger', 'intake'],
    ['intake', 'tool-branch'],
    ['intake', 'memory-branch'],
    ['tool-branch', 'agent'],
    ['memory-branch', 'agent'],
    ['agent', 'review'],
    ['review', 'approval'],
    ['approval', 'evidence'],
    ['evidence', 'completion'],
  ]

  return edgePairs.filter(([from, to]) => lookup.has(from) && lookup.has(to)).map(([from, to], index) => ({
    id: `${from}-${to}-${index}`,
    from,
    to,
    kind: from === 'intake' && (to === 'tool-branch' || to === 'memory-branch') ? 'branch' : 'handoff',
  }))
}

function pickActiveNode(nodes = [], liveStatus = 'unavailable') {
  if (liveStatus === 'running' || liveStatus === 'active') return nodes.find((node) => node.id === 'agent')?.id || nodes[0]?.id || null
  if (liveStatus === 'blocked' || liveStatus === 'failed') return nodes.find((node) => node.id === 'review')?.id || nodes[0]?.id || null
  if (liveStatus === 'complete') return nodes.find((node) => node.id === 'completion')?.id || nodes[0]?.id || null
  return nodes.find((node) => node.id === 'intake')?.id || nodes[0]?.id || null
}

export default function DepartmentAgentWorkflowPage() {
  const { departmentId, agentId } = useParams()

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

  const registryDepartments = asArray(workflowRegistry?.departments)
  const selectedWorkflowDepartment = registryDepartments.find((dept) => normalizeId(dept.id) === normalizeId(departmentId) || normalizeId(dept.name) === normalizeId(departmentId)) || null
  const detail = useMemo(() => ({ ...(selectedWorkflowDepartment || {}), ...(selectedDepartment || {}) }), [selectedWorkflowDepartment, selectedDepartment])
  const agentList = useMemo(() => asArray(registryAgents), [registryAgents])
  const selectedAgent = agentList.find((agent) => normalizeId(agent.id) === normalizeId(agentId) || normalizeId(agent.displayName) === normalizeId(agentId) || asArray(agent.aliases).some((alias) => normalizeId(alias) === normalizeId(agentId))) || null
  const selectedAgentName = selectedAgent?.displayName || selectedAgent?.id || agentId || 'Agent'
  const departmentName = detail?.name || detail?.title || departmentId || 'Department'
  const departmentTruth = truthLabel(detail?.sourceTruth || selectedWorkflowDepartment?.sourceTruth || selectedDepartment?.sourceTruth || (detail ? 'registry-backed' : 'unavailable')).toUpperCase()
  const agentTruthLabel = agentTruth(selectedAgent)
  const liveStatus = String(selectedAgent?.status || selectedWorkflowDepartment?.truthStatus || detail?.status?.current || 'unavailable').toLowerCase()
  const workflowTemplate = selectedWorkflowDepartment?.workflowTemplates?.find((template) => template?.nodeChain?.length) || selectedWorkflowDepartment?.workflowTemplates?.[0] || null
  const selectedJob = selectedWorkflowDepartment?.activeWorkflowRuns?.find((job) => normalizeId(job.owner || job.task || '') === normalizeId(selectedAgentName) || normalizeId(job.task || '').includes(normalizeId(selectedAgentName))) || selectedWorkflowDepartment?.activeWorkflowRuns?.[0] || null
  const workflowNodes = useMemo(() => buildWorkflowNodes({
    templateNodes: workflowTemplate?.nodeChain || [],
    departmentName,
    agentName: selectedAgentName,
    selectedJob,
    liveStatus,
    selectedAgent,
  }), [workflowTemplate?.nodeChain, departmentName, selectedAgentName, selectedJob, liveStatus, selectedAgent])
  const workflowEdges = useMemo(() => buildWorkflowEdges(workflowNodes), [workflowNodes])
  const activeNodeId = useMemo(() => pickActiveNode(workflowNodes, liveStatus), [workflowNodes, liveStatus])
  const evidenceItems = useMemo(() => {
    const items = asArray(selectedWorkflowDepartment?.evidenceLogs).slice(0, 8).map((item) => ({
      id: item.id,
      label: item.summary || item.message || item.type || 'Evidence',
      detail: item.summary || item.message || 'Evidence captured from the registry-backed department surface.',
      status: item.truthStatus || 'LIVE',
      at: item.at,
    }))
    if (selectedAgent) {
      items.unshift({
        id: `${selectedAgent.id}-registry`,
        label: `${selectedAgentName} registry record`,
        detail: `${selectedAgent.roleTitle || 'Role'} · ${selectedAgent.domainOwnership || 'Registry-backed desk'}`,
        status: agentTruthLabel,
        at: selectedAgent.updatedAt || selectedAgent.lastSeenAt,
      })
    }
    return items.length ? items : [{ id: 'seeded-evidence', label: 'Seeded workflow template', detail: 'Registry-backed template is visible while live execution is unavailable.', status: 'SEEDED' }]
  }, [selectedWorkflowDepartment?.evidenceLogs, selectedAgent, selectedAgentName, agentTruthLabel])
  const logItems = useMemo(() => {
    const liveRuns = asArray(selectedWorkflowDepartment?.activeWorkflowRuns).slice(0, 6).map((job) => ({
      id: job.id,
      message: job.task,
      status: job.status,
      at: job.updatedAt,
      step: job.nextAction,
    }))
    if (liveRuns.length) return liveRuns
    return [
      { id: 'seeded-1', message: `${selectedAgentName} workflow template loaded from the registry`, status: 'seeded', at: selectedWorkflowDepartment?.updatedAt || detail?.updatedAt || null, step: 'template' },
      { id: 'seeded-2', message: 'No live execution packet is attached to this desk right now', status: 'unavailable', at: null, step: 'runtime' },
    ]
  }, [selectedWorkflowDepartment?.activeWorkflowRuns, selectedAgentName, selectedWorkflowDepartment?.updatedAt, detail?.updatedAt])

  const summary = [
    { label: 'Department', value: departmentName },
    { label: 'Agent', value: selectedAgentName },
    { label: 'Truth', value: agentTruthLabel },
    { label: 'Workflow nodes', value: workflowNodes.length },
    { label: 'Evidence items', value: evidenceItems.length },
    { label: 'Active jobs', value: formatCount(asArray(selectedWorkflowDepartment?.activeWorkflowRuns).length) },
  ]

  const liveJobs = asArray(selectedWorkflowDepartment?.activeWorkflowRuns)
  const blockedJobs = asArray(selectedWorkflowDepartment?.blockedRejectedWork)
  const handoffs = asArray(selectedWorkflowDepartment?.queuedHandoffs)
  const workflowTemplateName = workflowTemplate?.name || `${departmentName} Intake → Execute → Review`

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${selectedAgentName} workflow canvas`}
        subtitle={`${departmentName} · ${truthLabel(agentTruthLabel).toUpperCase()} desk · node canvas, branches, evidence, and execution log`}
        actions={(
          <>
            <LinkButton to={`/departments/${normalizeId(departmentId)}`}>Back to floor</LinkButton>
            <LinkButton to="/departments">Departments</LinkButton>
            <LinkButton to="/agents">Agents</LinkButton>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SectionCard title="Desk truth" subtitle="Source labels stay explicit.">
          <div className="space-y-2">
            <StatusBadge variant={truthVariant(agentTruthLabel)}>{agentTruthLabel}</StatusBadge>
            <p className="text-[10px] text-white/45 leading-relaxed">{selectedAgent?.roleTitle || 'No live agent profile returned.'}</p>
          </div>
        </SectionCard>
        <SectionCard title="Department truth" subtitle="Floor registry and department snapshot.">
          <div className="space-y-2">
            <StatusBadge variant={truthVariant(departmentTruth)}>{departmentTruth}</StatusBadge>
            <p className="text-[10px] text-white/45 leading-relaxed">{detail?.mission || detail?.mandate || 'No department mission returned.'}</p>
          </div>
        </SectionCard>
        <SectionCard title="Live job state" subtitle="Truthful execution pressure.">
          <div className="space-y-2 text-[10px] text-white/45">
            <p>Active jobs: {formatCount(liveJobs.length)}</p>
            <p>Blocked jobs: {formatCount(blockedJobs.length)}</p>
            <p>Queued handoffs: {formatCount(handoffs.length)}</p>
          </div>
        </SectionCard>
        <SectionCard title="Last seen" subtitle="Registry and runtime timestamps.">
          <div className="space-y-2 text-[10px] text-white/45">
            <p>Agent: {formatDate(selectedAgent?.updatedAt || selectedAgent?.lastSeenAt)}</p>
            <p>Department: {formatDate(detail?.updatedAt)}</p>
            <p>Workflow: {workflowTemplateName}</p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Agent office context" subtitle="Registry-backed desk details, routing, and operating state.">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <GlassCard className="p-3"><p className="text-[8px] uppercase tracking-wider text-white/20">Role</p><p className="mt-1 text-[11px] text-white/70">{selectedAgent?.roleTitle || '—'}</p></GlassCard>
              <GlassCard className="p-3"><p className="text-[8px] uppercase tracking-wider text-white/20">Owner</p><p className="mt-1 text-[11px] text-white/70">{selectedAgent?.department || departmentName}</p></GlassCard>
              <GlassCard className="p-3"><p className="text-[8px] uppercase tracking-wider text-white/20">Status</p><p className="mt-1 text-[11px] text-white/70">{selectedAgent?.status || 'unavailable'}</p></GlassCard>
              <GlassCard className="p-3"><p className="text-[8px] uppercase tracking-wider text-white/20">Heartbeat</p><p className="mt-1 text-[11px] text-white/70">{selectedAgent?.heartbeat?.status || 'unavailable'}</p></GlassCard>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <GlassCard className="p-3">
                <p className="text-[8px] uppercase tracking-wider text-white/20">Permissions</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {asArray(selectedAgent?.permissions).length ? asArray(selectedAgent.permissions).map((perm) => (
                    <span key={perm} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/55">{perm}</span>
                  )) : <span className="text-[10px] text-white/25">No permissions returned.</span>}
                </div>
              </GlassCard>
              <GlassCard className="p-3">
                <p className="text-[8px] uppercase tracking-wider text-white/20">Evidence source</p>
                <p className="mt-2 text-[10px] leading-relaxed text-white/55">{selectedAgent?.agentFilesystem?.rootPath || selectedAgent?.agentState?.rootPath || 'Registry-backed desk only'}</p>
              </GlassCard>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-white/25">Route back to floor</p>
                <LinkButton to={`/departments/${normalizeId(departmentId)}`}>Department floor</LinkButton>
              </div>
              <p className="mt-2 text-[10px] text-white/40">Each agent office opens into this workflow view, and the floor remains the parent command surface.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Workflow summary" subtitle="Node path and routing legend.">
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              {summary.map((item) => (
                <GlassCard key={item.label} className="p-3">
                  <p className="text-[8px] uppercase tracking-wider text-white/20">{item.label}</p>
                  <p className="mt-1 text-[11px] text-white/70">{item.value}</p>
                </GlassCard>
              ))}
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-[10px] text-white/45">
              <p className="font-semibold text-white/75">Workflow shape</p>
              <p className="mt-1 leading-relaxed">Trigger → intake → branch lanes for tool/API and memory/registry → agent execution → review → approval → evidence → completion.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Workflow canvas" subtitle="The agent desk moves across nodes, branches, and evidence with truthful state labels.">
        <AgentWorkflowCanvas
          title={`${selectedAgentName} workflow`}
          subtitle={`${workflowTemplateName} · ${truthLabel(agentTruthLabel).toUpperCase()} · ${departmentName}`}
          sourceLabel={agentTruthLabel}
          nodes={workflowNodes}
          edges={workflowEdges}
          activeNodeId={activeNodeId}
          evidenceItems={evidenceItems}
          logItems={logItems}
          summary={summary.map((item) => ({ label: item.label, value: item.value }))}
          laneOrder={['main', 'tooling', 'memory', 'review', 'output']}
        />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Live / registry-backed work packets" subtitle="Packets tied to this desk or floor.">
          <SimpleTable
            columns={[
              { key: 'id', label: 'Job ID' },
              { key: 'task', label: 'Task' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge variant={statusVariant(row.status)}>{row.status}</StatusBadge> },
              { key: 'priority', label: 'Priority' },
              { key: 'nextAction', label: 'Next action' },
            ]}
            rows={liveJobs.length ? liveJobs : [{ id: 'seeded', task: 'No live execution packet returned', status: 'UNAVAILABLE', priority: '—', nextAction: 'Use registry-backed template' }]}
            empty="No live workflow records yet"
          />
        </SectionCard>

        <SectionCard title="Evidence and output" subtitle="What this workflow can prove right now.">
          <SimpleTable
            columns={[
              { key: 'label', label: 'Evidence item' },
              { key: 'detail', label: 'Detail' },
              { key: 'status', label: 'Truth', render: (row) => <StatusBadge variant={truthVariant(row.status)}>{truthLabel(row.status).toUpperCase()}</StatusBadge> },
              { key: 'at', label: 'Updated' },
            ]}
            rows={evidenceItems}
            empty="No live evidence/output captured yet"
          />
        </SectionCard>
      </div>
    </div>
  )
}
