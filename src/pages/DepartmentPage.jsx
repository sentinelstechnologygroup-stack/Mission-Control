import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { LinkButton, PageHeader, SectionCard } from '@/components/mission-control/LiveDataViews'
import AgentDesk from '@/components/departments/AgentDesk'

const DEPARTMENT_ALIAS = {
  command: 'nettie',
  technology: 'van',
  media: 'torina',
  security: 'perry',
  finance: 'dana',
  admin: 'icky',
  opportunity: 'funboy',
  research: 'rab',
}

const DISPLAY_NAME = {
  nettie: 'Command',
  van: 'Technology',
  torina: 'Media',
  perry: 'Security',
  dana: 'Finance',
  icky: 'Admin',
  funboy: 'Opportunity',
  rab: 'Research',
}

function canonicalDepartmentId(value = '') {
  const id = String(value || '').toLowerCase()
  return DEPARTMENT_ALIAS[id] || id
}

function formatCount(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '0'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function sourceLabel(dept) {
  if (!dept) return 'UNAVAILABLE'
  if (dept.sourceTruth === 'real' || dept.metrics?.openJobs !== undefined) return 'LIVE'
  if (dept.sourceTruth === 'demo_only') return 'SEEDED'
  return 'REGISTRY-BACKED'
}

export default function DepartmentPage() {
  const { departmentId } = useParams()
  const canonicalId = canonicalDepartmentId(departmentId)
  const displayName = DISPLAY_NAME[canonicalId] || departmentId || 'Department'

  const { data: department } = useQuery({
    queryKey: ['departments', departmentId],
    queryFn: () => api.department(departmentId),
    enabled: Boolean(departmentId),
    refetchInterval: 10000,
  })

  const { data: workflowRegistry } = useQuery({
    queryKey: ['departments', 'workflows'],
    queryFn: api.departmentsWorkflows,
    refetchInterval: 10000,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: api.agents,
    refetchInterval: 10000,
  })

  const detail = department || workflowRegistry?.departments?.find((item) => canonicalDepartmentId(item.id || item.name) === canonicalId) || null
  const departmentAgents = useMemo(() => {
    const names = Array.isArray(detail?.agents) ? detail.agents : []
    return names.map((name) => ({ id: String(name).toLowerCase(), displayName: name }))
  }, [detail?.agents])

  const activeCount = detail?.metrics?.openJobs ?? detail?.activeQueueCount ?? 0
  const blockedCount = detail?.metrics?.failedJobs ?? detail?.blockedItems ?? 0
  const completedCount = detail?.metrics?.completedJobs ?? detail?.recentlyCompletedItems ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${displayName} Department`}
        subtitle={detail?.mandate || detail?.mission || 'Department floor'}
        actions={(
          <>
            <LinkButton to="/departments">All departments</LinkButton>
            <LinkButton to="/agents">Agents</LinkButton>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <SectionCard title="Department head" subtitle="Floor owner and source label.">
          <div className="space-y-2">
            <div className="text-[12px] font-semibold text-white/80">{detail?.name || displayName}</div>
            <div className="text-[10px] text-white/30">{detail?.title || 'Department command center'}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/55">{sourceLabel(detail)}</span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-wider text-white/55">Updated {formatDate(detail?.updatedAt)}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Work counts" subtitle="Current floor state.">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.02] px-3 py-3">
              <div className="text-[8px] uppercase tracking-wider text-white/20">Active</div>
              <div className="mt-1 text-[18px] font-semibold text-white/75">{formatCount(activeCount)}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.02] px-3 py-3">
              <div className="text-[8px] uppercase tracking-wider text-white/20">Blocked</div>
              <div className="mt-1 text-[18px] font-semibold text-white/75">{formatCount(blockedCount)}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.02] px-3 py-3">
              <div className="text-[8px] uppercase tracking-wider text-white/20">Completed</div>
              <div className="mt-1 text-[18px] font-semibold text-white/75">{formatCount(completedCount)}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Floor link" subtitle="Open an agent workflow.">
          <div className="space-y-2 text-[10px] text-white/45">
            <p>Click any agent office panel below to open the workflow canvas.</p>
            <LinkButton to="/departments">Back to grid</LinkButton>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {departmentAgents.map((agent) => (
          <AgentDesk
            key={agent.id}
            agent={agent.displayName || agent.id}
            role="Agent office"
            department={detail?.name || displayName}
            manager={detail?.name || displayName}
            sourceLabel={detail ? 'REGISTRY-BACKED' : 'UNAVAILABLE'}
            status="idle"
            currentWork={activeCount ? `${formatCount(activeCount)} active packets on the floor` : 'No active work packets'}
            to={`/departments/${departmentId}/agents/${String(agent.id || agent.displayName || '').toLowerCase()}`}
          />
        ))}
      </div>
    </div>
  )
}
