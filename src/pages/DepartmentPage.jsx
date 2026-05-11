import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { MetricGrid, PageHeader, SectionCard, SimpleTable, StatusPill, KeyValueList, LinkButton } from '@/components/mission-control/LiveDataViews'

const jobColumns = [
  { key: 'id', label: 'Job ID' },
  { key: 'task', label: 'Task' },
  { key: 'project', label: 'Project' },
  { key: 'assignedAgent', label: 'Assigned agent' },
  { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
  { key: 'priority', label: 'Priority' },
  { key: 'riskLevel', label: 'Risk' },
  { key: 'createdAt', label: 'Created' },
  { key: 'updatedAt', label: 'Updated' },
  { key: 'nextAction', label: 'Next action' },
]

const reportColumns = [
  { key: 'title', label: 'Report' },
  { key: 'reportType', label: 'Type' },
  { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
  { key: 'createdAt', label: 'Created' },
]

const auditColumns = [
  { key: 'at', label: 'At' },
  { key: 'action', label: 'Action' },
  { key: 'note', label: 'Note' },
]

const localColumns = [
  { key: 'projectName', label: 'Project Name' },
  { key: 'projectType', label: 'Type' },
  { key: 'localPath', label: 'Local Path' },
  { key: 'frontendFramework', label: 'Frontend' },
  { key: 'backendFramework', label: 'Backend' },
  { key: 'frontendPort', label: 'FE Port' },
  { key: 'backendPort', label: 'BE Port' },
  { key: 'frontendStatus', label: 'FE Status', render: (row) => <StatusPill status={row.frontendStatus} /> },
  { key: 'backendStatus', label: 'BE Status', render: (row) => <StatusPill status={row.backendStatus} /> },
  { key: 'database', label: 'Database' },
  { key: 'environmentFilePresent', label: 'Env File' },
  { key: 'gitRepo', label: 'Git Repo' },
  { key: 'currentBranch', label: 'Branch' },
  { key: 'gitStatus', label: 'Git Status' },
  { key: 'lastBuildResult', label: 'Build' },
  { key: 'lastTestResult', label: 'Test' },
  { key: 'lastQaResult', label: 'QA' },
  { key: 'liveUrl', label: 'Live URL' },
  { key: 'previewUrl', label: 'Preview URL' },
  { key: 'deploymentProvider', label: 'Deploy' },
  { key: 'lastVerified', label: 'Last Verified' },
  { key: 'owner', label: 'Owner' },
  { key: 'nextAction', label: 'Next Action' },
  { key: 'notes', label: 'Notes' },
]

export default function DepartmentPage() {
  const { departmentId = '' } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['department', departmentId],
    queryFn: () => api.department(departmentId),
    enabled: Boolean(departmentId),
    refetchInterval: 10000,
  })

  const department = data || {}
  const metrics = department.metrics || {}
  const status = department.status || {}
  const reports = department.reports || {}
  const actions = department.actions || []
  const jobs = department.activeJobs || []
  const audit = department.audit || []
  const localProjects = department.vanActiveLocalTable || []

  return (
    <div className="space-y-4">
      <PageHeader
        title={department.name ? `${department.name} Office` : 'Department Office'}
        subtitle={isLoading ? 'Loading live department state…' : isError ? 'Department data unavailable.' : `${department.title || ''} · ${department.domain || ''}`}
        actions={
          <>
            <LinkButton to="/agents">All departments</LinkButton>
            <LinkButton to="/operations">Operations</LinkButton>
            <LinkButton to="/reports">Reports</LinkButton>
          </>
        }
      />

      <SectionCard title="Department identity" subtitle={department.mandate || 'No mandate available.'}>
        <KeyValueList
          items={[
            { label: 'Department head', value: department.name },
            { label: 'Title', value: department.title },
            { label: 'Domain', value: department.domain },
            { label: 'Sub-agents', value: Array.isArray(department.agents) ? department.agents.join(', ') : '—' },
          ]}
        />
      </SectionCard>

      <MetricGrid
        items={[
          { label: 'Open jobs', value: metrics.openJobs ?? '—' },
          { label: 'Completed', value: metrics.completedJobs ?? '—' },
          { label: 'Failed', value: metrics.failedJobs ?? '—' },
          { label: 'Avg turnaround', value: metrics.averageTurnaround ?? '—' },
          { label: 'Blocked', value: status.blockedItems ?? '—' },
          { label: 'Waiting on user', value: status.waitingOnUserItems ?? '—' },
          { label: 'Waiting on client', value: status.waitingOnClientItems ?? '—' },
          { label: 'High risk', value: metrics.highRiskItems ?? '—' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Action panel" subtitle="Mission Control controls available for this office">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <span key={action} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[10px] text-white/45">{action}</span>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Reports panel" subtitle="Latest department reporting status">
          <KeyValueList
            items={[
              { label: 'Latest report', value: reports.latestDepartmentReport?.title || 'None' },
              { label: 'Generated reports', value: reports.generatedReports ?? 0 },
              { label: 'Emailed reports', value: reports.emailedReports ?? 0 },
              { label: 'Pending reports', value: reports.pendingReports ?? 0 },
            ]}
          />
        </SectionCard>
      </div>

      <SectionCard title="Active jobs table" subtitle="Visible operational work assigned to this department">
        <SimpleTable columns={jobColumns} rows={jobs} empty="No active department jobs found." />
      </SectionCard>

      {department.name === 'Van' ? (
        <SectionCard title="Van Active Local Table" subtitle="Critical local project/runtime tracking across frontend, backend, repo, and QA state">
          <SimpleTable columns={localColumns} rows={localProjects} empty="No local projects discovered." />
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Generated reports" subtitle="Stored report artifacts for this office">
          <SimpleTable columns={reportColumns} rows={reports.items || []} empty="No stored reports for this department." />
        </SectionCard>
        <SectionCard title="Audit / history panel" subtitle="Recent actions, status changes, and notes">
          <SimpleTable columns={auditColumns} rows={audit} empty="No recent audit actions recorded." />
        </SectionCard>
      </div>
    </div>
  )
}
