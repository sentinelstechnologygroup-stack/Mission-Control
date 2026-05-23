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

  const { data: recentJobs = [] } = useQuery({
    queryKey: ['jobs', 'ledger'],
    queryFn: api.jobsLedger,
    refetchInterval: 10000,
  })

  const { data: workflowExecutions = [] } = useQuery({
    queryKey: ['workflows', 'executions', canonicalId],
    queryFn: () => api.workflowExecutions(50),
    refetchInterval: 10000,
  })

  const detail = department || workflowRegistry?.departments?.find((item) => canonicalDepartmentId(item.id || item.name) === canonicalId) || null
  const departmentAgents = useMemo(() => {
    const names = Array.isArray(detail?.agents) ? detail.agents : []
    return names.map((name) => ({ id: String(name).toLowerCase(), displayName: name }))
  }, [detail?.agents])

  const activePackets = useMemo(() => {
    const canonical = canonicalDepartmentId(detail?.id || departmentId)
    const departmentTokens = new Set(
      departmentAgents.flatMap((agent) => [
        canonicalDepartmentId(agent.id || ''),
        canonicalDepartmentId(agent.displayName || ''),
      ]).filter(Boolean),
    )
    const livePackets = []
    const addPacket = (job) => {
      const status = String(job.status || '').toLowerCase()
      const routedStatus = String(job.routeStatus || '').toLowerCase()
      const owner = canonicalDepartmentId(job.owner || job.department || job.assignedDepartmentHead || job.agent || job.assignedAgent || '')
      const matchedDepartment = owner === canonical || departmentTokens.has(owner)
      if (['queued', 'running', 'active', 'blocked', 'paused', 'in_progress', 'failed'].includes(status) && matchedDepartment) {
        livePackets.push({
          ...job,
          status: status === 'failed' && routedStatus === 'failure_packet' ? 'blocked' : status,
        })
      }
    }
    ;(Array.isArray(workflowExecutions) ? workflowExecutions : []).forEach((execution) => {
      addPacket({
        jobId: execution.jobId || execution.executionId,
        id: execution.jobId || execution.executionId,
        task: execution.title || execution.workflowName || execution.jobTitle || 'Untitled packet',
        title: execution.title || execution.workflowName || execution.jobTitle || 'Untitled packet',
        owner: execution.departmentHead || execution.owner || execution.assignedDepartmentHead || execution.department || '',
        department: execution.departmentHead || execution.department || execution.owner || '',
        assignedDepartmentHead: execution.departmentHead || execution.assignedDepartmentHead || '',
        assignedAgent: execution.agent || execution.assignedAgent || '',
        status: execution.status || 'queued',
        routeStatus: execution.routeStatus || execution.currentStep || 'packet',
        executionMode: execution.executionMode || 'MC_NATIVE',
        updatedAt: execution.updatedAt,
      })
    })
    ;(Array.isArray(detail?.activeWorkflowRuns) ? detail.activeWorkflowRuns : []).forEach((execution) => {
      addPacket({
        jobId: execution.jobId || execution.id || execution.executionId,
        id: execution.jobId || execution.id || execution.executionId,
        task: execution.task || execution.title || execution.label || 'Untitled packet',
        title: execution.task || execution.title || execution.label || 'Untitled packet',
        owner: execution.owner || execution.department || execution.assignedDepartmentHead || execution.assignedAgent || '',
        department: execution.department || execution.assignedDepartmentHead || execution.owner || '',
        assignedDepartmentHead: execution.assignedDepartmentHead || execution.department || execution.owner || '',
        assignedAgent: execution.assignedAgent || execution.agent || '',
        status: execution.status || 'queued',
        routeStatus: execution.routeStatus || execution.currentStep || execution.step || 'packet',
        executionMode: execution.executionMode || 'MC_NATIVE',
        updatedAt: execution.updatedAt || execution.createdAt,
      })
    })
    ;(Array.isArray(recentJobs) ? recentJobs : []).forEach(addPacket)
    return livePackets.slice(0, 5)
  }, [departmentId, departmentAgents, detail?.id, detail?.activeWorkflowRuns, recentJobs, workflowExecutions])

  const activeCount = Math.max(detail?.metrics?.openJobs ?? 0, detail?.activeQueueCount ?? 0, activePackets.length)
  const blockedCount = Math.max(
    detail?.metrics?.failedJobs ?? 0,
    detail?.blockedItems ?? 0,
    activePackets.filter((job) => ['blocked', 'failed'].includes(String(job.status || '').toLowerCase())).length,
  )
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

      <SectionCard title="Active packets" subtitle="Live queue packets on this floor, if any.">
        <div className="space-y-2">
          {activePackets.length ? activePackets.map((job) => (
            <div key={job.jobId || job.id} className="rounded-2xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 text-[11px] text-white/60">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white/75">{job.task || job.title || job.jobId || 'Untitled packet'}</p>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-wider text-white/55">{String(job.status || 'queued')}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/35">
                <span>Job: {job.jobId || job.id || '—'}</span>
                <span>Owner: {job.owner || job.department || '—'}</span>
                <span>Route: {job.routeStatus || job.route || '—'}</span>
                <span>Mode: {job.executionMode || 'MC_NATIVE'}</span>
              </div>
            </div>
          )) : <p className="text-[11px] text-white/35">No active work packets.</p>}
        </div>
      </SectionCard>
    </div>
  )
}
