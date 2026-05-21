import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, Bot, Building2, ChevronRight, CircleDot, FileText, Shield, Workflow } from 'lucide-react'

import { api } from '@/lib/api'
import GlassCard from '@/components/mission-control/GlassCard'
import StatusBadge from '@/components/mission-control/StatusBadge'
import { LinkButton, PageHeader, SectionCard, SimpleTable, StatusPill } from '@/components/mission-control/LiveDataViews'
import AgentDesk from '@/components/departments/AgentDesk'
import WorkflowCanvas from '@/components/departments/WorkflowCanvas'

const DEPARTMENT_ORDER = ['nettie', 'van', 'perry', 'torina', 'dana', 'icky', 'funboy', 'rab', 'novella']

const DEPARTMENT_META = {
  nettie: { department: 'Command', manager: 'Patrick', role: 'Executive Assistant / Chief of Staff / Command Coordinator', room: 'Executive command lane' },
  van: { department: 'Technology', manager: 'Nettie', role: 'Chief Technology & Operations Officer', room: 'Technology floor' },
  perry: { department: 'Security', manager: 'Nettie', role: 'Chief Security Officer', room: 'Security floor' },
  torina: { department: 'Media', manager: 'Nettie', role: 'Chief Media Officer', room: 'Media floor' },
  dana: { department: 'Finance', manager: 'Nettie', role: 'Chief Financial Officer', room: 'Finance floor' },
  icky: { department: 'Admin', manager: 'Nettie', role: 'Chief Administrative Officer', room: 'Admin floor' },
  funboy: { department: 'Opportunity Intelligence', manager: 'Nettie', role: 'Chief Opportunity Intelligence Officer', room: 'Intelligence floor' },
  rab: { department: 'Research & Development', manager: 'Nettie', role: 'Chief Research & Development Officer', room: 'R&D floor' },
  novella: { department: 'Narrative Systems', manager: 'Torina', role: 'Chief Narrative Systems Officer', room: 'Narrative floor' },
}

const DEPARTMENT_DESKS = {
  nettie: ['Nettie'],
  van: ['Van', 'Forge', 'Blueprint', 'Warden', 'Prism', 'Pulse', 'Sessions', 'SignalDoc'],
  perry: ['Perry', 'Lock', 'Vault', 'Sentry', 'Calamity'],
  torina: ['Torina', 'Quill', 'Scribe', 'Frame', 'Signal Media', 'Polish'],
  dana: ['Dana', 'Ledger', 'Anvil', 'Reserve', 'Portfolio'],
  icky: ['Icky', 'Clerk', 'Anchor', 'Orderly', 'Table', 'Case', 'Bea'],
  funboy: ['Funboy', 'Drift', 'Signal Intel', 'Heatmap', 'Scout', 'Rank', 'Rollup', 'SIS'],
  rab: ['Rab', 'Lab', 'Model', 'Pilot', 'Vector'],
}

const DEPARTMENT_DESK_NOTES = {
  nettie: 'Command intake and routing.',
  van: 'Technology delivery and runtime operations.',
  perry: 'Security review and gating.',
  torina: 'Media packaging and publishing.',
  dana: 'Finance, ROI, and cost visibility.',
  icky: 'Administration and process control.',
  funboy: 'Opportunity intelligence and signal triage.',
  rab: 'R&D and prototype validation.',
}

const ALIAS_DEPARTMENT = {
  'Signal Media': 'torina',
  'Signal Intel': 'funboy',
}

const ALIAS_SOURCE = new Set(['forge', 'blueprint', 'warden', 'prism', 'pulse', 'sessions', 'signaldoc', 'lock', 'vault', 'sentry', 'calamity', 'quill', 'scribe', 'frame', 'polish', 'ledger', 'anvil', 'reserve', 'portfolio', 'clerk', 'anchor', 'orderly', 'table', 'case', 'bea', 'drift', 'heatmap', 'scout', 'rank', 'rollup', 'sis', 'lab', 'model', 'pilot', 'vector', 'signal media', 'signal intel'])

function normalize(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatCount(value) {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  return Number.isFinite(num) ? num.toLocaleString() : String(value)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function findAgentRecord(name, registry = []) {
  const normalized = normalize(name)
  return registry.find((agent) => {
    const aliases = Array.isArray(agent.aliases) ? agent.aliases : []
    return normalize(agent.id) === normalized || normalize(agent.displayName) === normalized || aliases.some((alias) => normalize(alias) === normalized)
  }) || null
}

function sourceLabelForDesk(name, registryAgent, departmentId) {
  if (!registryAgent) return ALIAS_DEPARTMENT[name] ? 'SEEDED' : 'UNAVAILABLE'
  const isPrimary = normalize(registryAgent.displayName) === normalize(name) || normalize(registryAgent.id) === normalize(name)
  if (!isPrimary || ALIAS_SOURCE.has(normalize(name))) return 'SEEDED'
  if (registryAgent.agentFilesystem?.complete && ['available', 'assigned', 'active', 'idle'].includes(String(registryAgent.status || '').toLowerCase())) return 'LIVE'
  if (registryAgent.agentFilesystem?.complete) return 'SEEDED'
  return 'STATIC'
}

function buildDesk(name, registryAgents, departmentById, fallbackDepartmentId) {
  const departmentId = ALIAS_DEPARTMENT[name] || fallbackDepartmentId
  const meta = DEPARTMENT_META[departmentId] || DEPARTMENT_META.nettie
  const department = departmentById[departmentId] || null
  const agent = findAgentRecord(name, registryAgents)
  const sourceLabel = sourceLabelForDesk(name, agent, departmentId)
  const isPrimary = agent ? normalize(agent.displayName) === normalize(name) || normalize(agent.id) === normalize(name) : false
  const status = agent?.status || (department?.activeQueueCount > 0 ? 'active' : 'idle')
  const currentWork = agent?.activeQueueCount > 0
    ? `${formatCount(agent.activeQueueCount)} queued packets`
    : department?.activeQueueCount > 0 && isPrimary
      ? `${formatCount(department.activeQueueCount)} packets in the ${meta.department.toLowerCase()} lane`
      : 'No active work packets'
  const skills = Array.isArray(agent?.permissions) && agent.permissions.length
    ? agent.permissions.map((permission) => permission.replace(/-/g, ' '))
    : [meta.department, 'registry-backed desk']
  const tools = agent?.executorRoute?.target
    ? [agent.executorRoute.target, agent.fallbackRoute?.target || '—']
    : ['registry', 'workflow lane']
  const evidence = agent?.updatedAt
    ? `Last registry update ${formatDate(agent.updatedAt)} · heartbeat ${agent.heartbeat?.status || 'unknown'}`
    : 'No live evidence available'

  return {
    agent: name,
    role: agent?.roleTitle || meta.role,
    manager: meta.manager,
    department: meta.department,
    status,
    currentWork,
    room: meta.room,
    skills,
    tools,
    evidence,
    breakState: agent?.heartbeat?.status && agent.heartbeat.status !== 'live' ? agent.heartbeat.status : null,
    tone: sourceLabel === 'LIVE' ? 'active' : sourceLabel === 'SEEDED' ? 'warning' : sourceLabel === 'STATIC' ? 'critical' : 'idle',
    sourceLabel,
  }
}

function deskTone(item) {
  const value = Number(item?.activeQueueCount || 0)
  if (Number(item?.blockedItems || 0) > 0) return 'critical'
  if (value > 0) return 'active'
  if (item?.sourceTruth === 'demo_only') return 'warning'
  return 'idle'
}

function departmentNode(dept) {
  const queue = Number(dept.activeQueueCount || 0)
  const blocked = Number(dept.blockedItems || 0)
  return {
    id: dept.id,
    label: dept.name,
    type: 'agent',
    status: blocked > 0 ? 'blocked' : queue > 0 ? 'running' : 'idle',
    detail: `${formatCount(queue)} active packets · ${formatCount(blocked)} blocked/rejected · ${dept.nextRecommendedAutomation || 'No live workflow records yet.'}`,
    owner: dept.name,
    tool: 'Department floor',
  }
}

function departmentOrder(list = []) {
  const map = new Map(list.map((item) => [String(item.id || item.name || '').toLowerCase(), item]))
  return DEPARTMENT_ORDER.map((id) => map.get(id)).filter(Boolean)
}

function DeskGrid({ departmentId, registryAgents, departmentsById }) {
  const desks = DEPARTMENT_DESKS[departmentId] || []
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {desks.map((deskName) => (
        <AgentDesk key={deskName} {...buildDesk(deskName, registryAgents, departmentsById, departmentId)} />
      ))}
    </div>
  )
}

function LiveSourceRow({ label, value, tone = 'idle' }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[8px] uppercase tracking-wider text-white/20">{label}</p>
      <p className="mt-1 text-[11px] text-white/60">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-wider text-white/24">{tone}</p>
    </div>
  )
}

export default function Agents() {
  const { data: registry = [] } = useQuery({
    queryKey: ['agents', 'registry'],
    queryFn: api.agents,
    refetchInterval: 10000,
  })

  const { data: workflowRegistry } = useQuery({
    queryKey: ['agents', 'departments-workflows'],
    queryFn: api.departmentsWorkflows,
    refetchInterval: 10000,
  })

  const { data: jobsSummary } = useQuery({
    queryKey: ['agents', 'jobs-summary'],
    queryFn: api.jobsSummary,
    refetchInterval: 10000,
  })

  const { data: runtimeHealth } = useQuery({
    queryKey: ['agents', 'runtime-health'],
    queryFn: api.runtimeHealth,
    refetchInterval: 10000,
  })

  const departmentsById = useMemo(() => {
    const departments = Array.isArray(workflowRegistry?.departments) ? workflowRegistry.departments : []
    return departments.reduce((acc, dept) => {
      acc[dept.id] = dept
      return acc
    }, {})
  }, [workflowRegistry])

  const orderedDepartments = useMemo(() => departmentOrder(Array.isArray(workflowRegistry?.departments) ? workflowRegistry.departments : []), [workflowRegistry])

  const deskRows = useMemo(() => {
    const rows = []
    for (const departmentId of DEPARTMENT_ORDER) {
      for (const deskName of DEPARTMENT_DESKS[departmentId] || []) {
        const desk = buildDesk(deskName, registry, departmentsById, departmentId)
        rows.push({
          id: desk.agent,
          department: desk.department,
          manager: desk.manager,
          role: desk.role,
          status: desk.status,
          sourceLabel: desk.sourceLabel,
          currentWork: desk.currentWork,
          skills: desk.skills.slice(0, 3).join(', '),
        })
      }
    }
    return rows
  }, [registry, departmentsById])

  const sourceCounts = useMemo(() => deskRows.reduce((acc, row) => {
    acc[row.sourceLabel] = (acc[row.sourceLabel] || 0) + 1
    return acc
  }, {}), [deskRows])

  const workflowNodes = useMemo(() => {
    return orderedDepartments.map((dept) => departmentNode(dept))
  }, [orderedDepartments])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agents"
        subtitle="Registry-backed employee desks and department floors for Mission Control."
        actions={(
          <>
            <LinkButton to="/departments">Departments</LinkButton>
            <LinkButton to="/system">System</LinkButton>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="py-3">
          <p className="text-[9px] uppercase tracking-wider text-white/25">Registry agents</p>
          <p className="mt-2 text-[18px] font-bold font-mono text-white/75">{formatCount(registry.length)}</p>
          <p className="mt-1 text-[9px] text-white/25">Live registry entries</p>
        </GlassCard>
        <GlassCard className="py-3">
          <p className="text-[9px] uppercase tracking-wider text-white/25">Departments</p>
          <p className="mt-2 text-[18px] font-bold font-mono text-white/75">{formatCount(Array.isArray(workflowRegistry?.departments) ? workflowRegistry.departments.length : 0)}</p>
          <p className="mt-1 text-[9px] text-white/25">{workflowRegistry?.summary ? `${workflowRegistry.summary.realDepartments || 0} real · ${workflowRegistry.summary.demoDepartments || 0} demo` : 'Registry unavailable'}</p>
        </GlassCard>
        <GlassCard className="py-3">
          <p className="text-[9px] uppercase tracking-wider text-white/25">Queued / blocked</p>
          <p className="mt-2 text-[18px] font-bold font-mono text-white/75">{formatCount(jobsSummary?.totalQueued || 0)} / {formatCount(jobsSummary?.totalBlocked || 0)}</p>
          <p className="mt-1 text-[9px] text-white/25">{jobsSummary?.truthStatus || 'LIVE'}</p>
        </GlassCard>
        <GlassCard className="py-3">
          <p className="text-[9px] uppercase tracking-wider text-white/25">Runtime</p>
          <p className="mt-2 text-[18px] font-bold font-mono text-white/75">{runtimeHealth?.overallHealth || '—'}</p>
          <p className="mt-1 text-[9px] text-white/25">{runtimeHealth?.operationalConfidence?.label || 'unavailable'}</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Command lane" subtitle="Executive routing and live source labels.">
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {['Nettie', 'Van', 'Perry', 'Torina', 'Dana', 'Icky'].map((name) => {
              const desk = buildDesk(name, registry, departmentsById, normalize(name).toLowerCase())
              return <AgentDesk key={name} {...desk} />
            })}
          </div>
        </SectionCard>

        <SectionCard title="Source labels" subtitle="What is live, seeded, static, or unavailable right now.">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <LiveSourceRow label="LIVE" value={formatCount(sourceCounts.LIVE || 0)} tone="live" />
            <LiveSourceRow label="SEEDED" value={formatCount(sourceCounts.SEEDED || 0)} tone="seeded" />
            <LiveSourceRow label="STATIC" value={formatCount(sourceCounts.STATIC || 0)} tone="static" />
            <LiveSourceRow label="UNAVAILABLE" value={formatCount(sourceCounts.UNAVAILABLE || 0)} tone="unavailable" />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Department desk floors" subtitle="All required employee desks grouped by department.">
        <div className="space-y-5">
          {DEPARTMENT_ORDER.map((departmentId) => {
            const meta = DEPARTMENT_META[departmentId]
            const department = departmentsById[departmentId]
            if (!meta || !department) return null
            return (
              <div key={departmentId} className="space-y-3 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold text-white/75">{department.name} Department</p>
                    <p className="text-[10px] text-white/30">{meta.role}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-white/20">Manager: {meta.manager}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={deskTone(department)} />
                    <Link to={`/departments/${departmentId}`} className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/55 hover:bg-white/[0.06] hover:text-white/80">
                      Open office <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <DeskGrid departmentId={departmentId} registryAgents={registry} departmentsById={departmentsById} />
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Workflow traffic map" subtitle="Work packets, handoffs, and desk stages are visible as a node chain.">
        <WorkflowCanvas
          title="Mission Control workflow"
          subtitle="Department floors carry work packets; evidence comes back through the same lanes."
          nodes={workflowNodes}
          footer={jobsSummary?.stale ? 'Queue truth is live, but the runtime reports stale jobs.' : 'Live registry and queue truth are aligned.'}
        />
      </SectionCard>

      <SectionCard title="Registry table" subtitle="Source-backed employee state across Mission Control.">
        <SimpleTable
          columns={[
            { key: 'id', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'manager', label: 'Manager' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
            { key: 'sourceLabel', label: 'Source', render: (row) => <StatusBadge variant={row.sourceLabel === 'LIVE' ? 'active' : row.sourceLabel === 'SEEDED' ? 'warning' : row.sourceLabel === 'STATIC' ? 'critical' : 'idle'}>{row.sourceLabel}</StatusBadge> },
            { key: 'currentWork', label: 'Current assignment' },
            { key: 'skills', label: 'Skills' },
          ]}
          rows={deskRows}
          empty="No registry desks available yet."
        />
      </SectionCard>
    </div>
  )
}
