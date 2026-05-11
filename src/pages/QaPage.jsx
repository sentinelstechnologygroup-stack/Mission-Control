import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { MetricGrid, PageHeader, SectionCard, SimpleTable, StatusPill } from '@/components/mission-control/LiveDataViews'

export default function QaPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['qa'],
    queryFn: api.qa,
    refetchInterval: 10000,
  })

  const summary = data?.summary || {}
  const jobs = data?.jobs || []
  const checks = data?.checks || []
  const ciEntries = data?.ciEntries || []

  return (
    <div className="space-y-4">
      <PageHeader title="QA / Validation" subtitle={isLoading ? 'Loading QA state…' : isError ? 'QA state unavailable.' : 'Build status, route checks, security checks, and QA job visibility.'} />
      <MetricGrid
        items={[
          { label: 'Open QA jobs', value: summary.openQaJobs ?? 0 },
          { label: 'Blocked QA jobs', value: summary.blockedQaJobs ?? 0 },
          { label: 'Open CI issues', value: summary.ciOpenIssues ?? 0 },
          { label: 'Last updated', value: summary.lastUpdated || '—' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Validation checks" subtitle="Current platform validation status">
          <SimpleTable
            columns={[
              { key: 'name', label: 'Check' },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'source', label: 'Source' },
            ]}
            rows={checks}
            empty="No validation checks available."
          />
        </SectionCard>
        <SectionCard title="CI register" subtitle="Open continuous-improvement and repeated-failure items">
          <SimpleTable
            columns={[
              { key: 'title', label: 'Issue' },
              { key: 'type', label: 'Type' },
              { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
              { key: 'score', label: 'Score' },
              { key: 'proposedFix', label: 'Proposed Fix' },
            ]}
            rows={ciEntries}
            empty="No CI register entries found."
          />
        </SectionCard>
      </div>

      <SectionCard title="QA jobs" subtitle="Jobs currently associated with QA or validation work">
        <SimpleTable
          columns={[
            { key: 'id', label: 'Job ID' },
            { key: 'task', label: 'Task' },
            { key: 'department', label: 'Department' },
            { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
            { key: 'stage', label: 'Stage' },
            { key: 'nextAction', label: 'Next Action' },
          ]}
          rows={jobs}
          empty="No QA jobs found."
        />
      </SectionCard>
    </div>
  )
}
