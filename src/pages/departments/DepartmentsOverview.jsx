import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Bot, Brain, Building2, ChevronRight, Radar, Workflow, ShieldAlert, Sparkles } from 'lucide-react'
import { LinkButton, PageHeader, SectionCard, SimpleTable, StatusPill } from '@/components/mission-control/LiveDataViews'
import AgentDesk from '@/components/departments/AgentDesk'
import DepartmentRoom from '@/components/departments/DepartmentRoom'
import WorkflowCanvas from '@/components/departments/WorkflowCanvas'
import { useDepartmentSurfaceData } from './useDepartmentSurface'

function formatCount(value) {
  if (value === null || value === undefined) return '—'
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : String(value)
}

function statusTone(item) {
  if (Number(item?.blockedItems || 0) > 0) return 'critical'
  if (Number(item?.activeQueueCount || 0) > 0) return 'active'
  if (item?.sourceTruth === 'mixed') return 'warning'
  return 'idle'
}

function departmentOrder(list = []) {
  const order = ['nettie', 'van', 'perry', 'torina', 'dana', 'icky', 'funboy', 'rab', 'novella']
  const map = new Map(list.map((item) => [String(item.id || item.name || '').toLowerCase(), item]))
  return order.map((id) => map.get(id)).filter(Boolean)
}

function DepartmentTile({ dept, primary = false }) {
  const tone = statusTone(dept)
  return (
    <Link
      to={`/departments/${dept.id}`}
      className={`block rounded-3xl border p-5 transition-transform hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${tone === 'active' ? 'border-emerald-500/20 bg-emerald-500/6' : tone === 'critical' ? 'border-rose-500/20 bg-rose-500/6' : tone === 'warning' ? 'border-amber-500/20 bg-amber-500/6' : 'border-white/[0.06] bg-white/[0.03]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-white/82">{dept.name}</p>
          <p className="mt-0.5 text-[10px] text-white/30">{dept.title}</p>
        </div>
        <StatusPill status={tone === 'active' ? 'running' : tone === 'critical' ? 'blocked' : tone === 'warning' ? 'queued' : 'idle'} />
      </div>
      <p className="mt-3 line-clamp-3 text-[10px] leading-relaxed text-white/36">{dept.mission || dept.mandate || dept.domain}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/[0.02] px-3 py-2"><p className="text-[8px] uppercase tracking-wider text-white/20">Queue</p><p className="mt-1 text-[11px] text-white/60">{formatCount(dept.activeQueueCount)}</p></div>
        <div className="rounded-xl bg-white/[0.02] px-3 py-2"><p className="text-[8px] uppercase tracking-wider text-white/20">Blocked</p><p className="mt-1 text-[11px] text-white/60">{formatCount(dept.blockedItems)}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(dept.agents || []).slice(0, 4).map((agent) => (
          <span key={agent} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/55">{agent}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase tracking-wider text-white/25">{dept.sourceTruth || (primary ? 'real' : 'demo')}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] uppercase tracking-wider text-white/55">
          Open floor
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  )
}

const COMMAND_LANE = [
  {
    agent: 'Nettie',
    role: 'Command routing and executive coordination',
    status: 'active',
    currentWork: 'Intake desk, routing wall, approval room, executive briefing room',
    room: 'Executive command lane',
    skills: ['Intake', 'Routing', 'Approval', 'Briefing'],
    tools: ['Job ledger', 'handoff wall', 'workflow nodes'],
    evidence: 'Routes are persisted before work moves to any department.',
    tone: 'active',
  },
  {
    agent: 'Van',
    role: 'Technical operations and delivery',
    status: 'review',
    currentWork: 'Build desk, CI/test lab, deployment room, code review table',
    room: 'Technology floor',
    skills: ['Build', 'QA', 'Deploy', 'Review'],
    tools: ['Forge', 'Warden', 'Pulse', 'SignalDoc'],
    evidence: 'Technical execution stays visible as a node chain and evidence trail.',
    tone: 'warning',
  },
  {
    agent: 'Perry',
    role: 'Security, risk, approvals',
    status: 'idle',
    currentWork: 'Risk review room, secrets vault, permissions desk, red-team room',
    room: 'Security floor',
    skills: ['Risk', 'Secrets', 'Permissions', 'Red team'],
    tools: ['Lock', 'Vault', 'Sentry', 'Calamity'],
    evidence: 'Approval gates remain explicit before any sensitive action.',
    tone: 'idle',
  },
]

export default function DepartmentsOverview() {
  const { workflowRegistry, departmentList, queueSummary, runtimeHealth, executorEvidence, recentActivity, jobsSummary, executorStatus, systemTruth, isOverview } = useDepartmentSurfaceData(null, { overview: true })

  const departments = useMemo(() => {
    const registryDepartments = Array.isArray(workflowRegistry.departments) && workflowRegistry.departments.length
      ? workflowRegistry.departments
      : departmentList
    return departmentOrder(registryDepartments).map((dept) => ({
      ...dept,
      activeQueueCount: Number(dept.activeQueueCount || 0),
      blockedItems: Number(dept.blockedItems || 0),
      sourceTruth: dept.sourceTruth || (dept.demoOnly ? 'demo_only' : 'real'),
    }))
  }, [workflowRegistry.departments, departmentList])

  const trafficNodes = useMemo(() => {
    const commandStart = {
      id: 'patrick-nettie',
      label: 'Patrick → Nettie',
      type: 'trigger',
      status: 'active',
      detail: 'Command intake enters the company through Nettie before any department work begins.',
      owner: 'Nettie',
      tool: 'Command bridge + job ledger',
    }

    const deptNodes = departments.map((dept) => ({
      id: dept.id,
      label: dept.name,
      type: 'agent',
      status: Number(dept.blockedItems || 0) > 0 ? 'blocked' : Number(dept.activeQueueCount || 0) > 0 ? 'running' : 'idle',
      detail: `Queue ${formatCount(dept.activeQueueCount)} · blockers ${formatCount(dept.blockedItems)} · next ${dept.nextRecommendedAutomation || 'follow the board'}`,
      owner: dept.name,
      tool: 'Workflow canvas node',
    }))

    const commandEnd = {
      id: 'evidence-return',
      label: 'Evidence / next handoff',
      type: 'evidence',
      status: 'review',
      detail: 'Output is captured, evidence is attached, and the next department receives the packet if needed.',
      owner: 'Mission Control',
      tool: 'Evidence drawer',
    }

    return [commandStart, ...deptNodes, commandEnd]
  }, [departments])

  const overviewStats = [
    { label: 'Departments', value: departments.length, sub: `${formatCount(workflowRegistry.summary?.realDepartments || 0)} real · ${formatCount(workflowRegistry.summary?.demoDepartments || 0)} demo` },
    { label: 'Active queues', value: departments.reduce((sum, item) => sum + Number(item.activeQueueCount || 0), 0), sub: 'Cross-department work in flight' },
    { label: 'Blocked items', value: departments.reduce((sum, item) => sum + Number(item.blockedItems || 0), 0), sub: 'Needs recovery or review' },
    { label: 'Executor truth', value: runtimeHealth.overallHealth || '—', sub: executorStatus?.executor || 'executor status unavailable' },
  ]

  const activeDepartments = departments.filter((dept) => Number(dept.activeQueueCount || 0) > 0 || Number(dept.blockedItems || 0) > 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Departments"
        subtitle="Company building overview with floor map, cross-department workflow traffic, and command lanes for an AI-operated command center."
        actions={(
          <>
            <LinkButton to="/nettie">Nettie</LinkButton>
            <LinkButton to="/system">System</LinkButton>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <SectionCard key={stat.label} title={stat.label} subtitle={stat.sub}>
            <p className="text-[22px] font-semibold font-mono text-white/80">{stat.value}</p>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <DepartmentRoom title="Executive command lane" subtitle="Patrick, Nettie, and the core operating departments." accent="Command intake → routing → approval → execution → evidence">
          <div className="grid gap-3 lg:grid-cols-3">
            {COMMAND_LANE.map((desk) => (
              <AgentDesk key={desk.agent} {...desk} />
            ))}
          </div>
        </DepartmentRoom>

        <DepartmentRoom title="Live work pressure" subtitle="Which departments are actively moving packets right now." accent="Queue depth and blocker pressure">
          <div className="space-y-2">
            {activeDepartments.length ? activeDepartments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <div>
                  <p className="text-[11px] font-semibold text-white/75">{dept.name}</p>
                  <p className="text-[10px] text-white/28">{dept.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] uppercase tracking-wider ${Number(dept.activeQueueCount || 0) > 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-white/[0.08] bg-white/[0.03] text-white/35'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${Number(dept.activeQueueCount || 0) > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                    {formatCount(dept.activeQueueCount)} active
                  </span>
                  {Number(dept.blockedItems || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[9px] uppercase tracking-wider text-rose-200">
                      {formatCount(dept.blockedItems)} blocked
                    </span>
                  ) : null}
                </div>
              </div>
            )) : <p className="text-[10px] text-white/25">No active pressure detected right now.</p>}
          </div>
        </DepartmentRoom>
      </div>

      <DepartmentRoom title="Workflow traffic map" subtitle="Node chain showing how work moves through the company floors." accent="Visualized packet movement">
        <WorkflowCanvas
          title="Cross-department workflow"
          subtitle="From Patrick/Nettie intake to department floors, review, approval, and evidence output."
          nodes={trafficNodes}
          footer="Each node corresponds to a persisted step or department floor in the Mission Control workflow model."
        />
      </DepartmentRoom>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DepartmentRoom title="Department floor map" subtitle="Each floor is its own command center, not a generic page." accent="Open floor links appear on live departments">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((dept) => (
              <DepartmentTile key={dept.id} dept={dept} primary={dept.id === 'nettie' || dept.id === 'van'} />
            ))}
          </div>
        </DepartmentRoom>

        <DepartmentRoom title="Execution evidence drawer" subtitle="Recent activity, job pressure, and proof of state." accent="Evidence remains visible">
          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <p className="text-[8px] uppercase tracking-wider text-white/20">Queue summary</p>
                <p className="mt-1 text-[11px] text-white/60">Queued {formatCount(queueSummary.totalQueued)} · blocked {formatCount(queueSummary.totalBlocked)}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <p className="text-[8px] uppercase tracking-wider text-white/20">Jobs completed</p>
                <p className="mt-1 text-[11px] text-white/60">{formatCount(jobsSummary.totalCompleted ?? 0)}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <p className="text-[8px] uppercase tracking-wider text-white/20">Executor status</p>
                <p className="mt-1 text-[11px] text-white/60">{executorStatus?.available ? 'available' : 'unavailable'}{executorStatus?.cooldown ? ` · cooldown ${executorStatus.cooldown}` : ''}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                <p className="text-[8px] uppercase tracking-wider text-white/20">Evidence pulse</p>
                <p className="mt-1 text-[11px] text-white/60">{executorEvidence.generatedAt || executorEvidence.updatedAt || '—'}</p>
              </div>
            </div>

            <div className="space-y-2">
              {(recentActivity || []).slice(0, 6).map((item) => (
                <div key={item.id || `${item.summary}-${item.updatedAt}`} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                  <span className={`mt-0.5 h-2 w-2 rounded-full ${String(item.truthStatus || '').toLowerCase() === 'live' ? 'bg-emerald-400' : 'bg-white/25'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/70">{item.summary || item.task || item.title || 'Activity'}</p>
                    <p className="text-[9px] text-white/25">{item.updatedAt || item.at || '—'}</p>
                  </div>
                  <StatusPill status={item.truthStatus || item.status || 'live'} />
                </div>
              ))}
            </div>
          </div>
        </DepartmentRoom>
      </div>

      <DepartmentRoom title="Operational truth" subtitle="This board reflects current system state and department traffic." accent="Live status labels">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white/[0.02] px-3 py-2"><p className="text-[8px] uppercase tracking-wider text-white/20">Overall health</p><p className="mt-1 text-[11px] text-white/60">{runtimeHealth.overallHealth || '—'}</p></div>
          <div className="rounded-2xl bg-white/[0.02] px-3 py-2"><p className="text-[8px] uppercase tracking-wider text-white/20">Executor truth</p><p className="mt-1 text-[11px] text-white/60">{runtimeHealth.executorTruth || '—'}</p></div>
          <div className="rounded-2xl bg-white/[0.02] px-3 py-2"><p className="text-[8px] uppercase tracking-wider text-white/20">Registry generated</p><p className="mt-1 text-[11px] text-white/60">{workflowRegistry.generatedAt || '—'}</p></div>
          <div className="rounded-2xl bg-white/[0.02] px-3 py-2"><p className="text-[8px] uppercase tracking-wider text-white/20">Current mode</p><p className="mt-1 text-[11px] text-white/60">{systemTruth?.system?.hermesMode || systemTruth?.system?.selectedExecutor || '—'}</p></div>
        </div>
      </DepartmentRoom>
    </div>
  )
}
