import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { MetricGrid, PageHeader, SectionCard, SimpleTable, StatusPill, LinkButton } from '@/components/mission-control/LiveDataViews'

const reportColumns = [
  { key: 'title', label: 'Title' },
  { key: 'department', label: 'Department' },
  { key: 'createdBy', label: 'Created By' },
  { key: 'reportType', label: 'Type' },
  { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
  { key: 'emailedTo', label: 'Emailed To' },
  { key: 'createdAt', label: 'Created' },
  { key: 'body', label: 'Body / Summary' },
]

export default function ReportsPage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['reports'],
    queryFn: api.reports,
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        subtitle={isLoading ? 'Loading report artifacts…' : isError ? 'Reports unavailable.' : 'Department, executive, emailed, and generated report artifacts stored in Mission Control.'}
        actions={<LinkButton to="/departments/dana">Dana office</LinkButton>}
      />

      <MetricGrid
        items={[
          { label: 'Total reports', value: data.length },
          { label: 'Dana reports', value: data.filter((item) => item.department === 'Dana').length },
          { label: 'Executive reports', value: data.filter((item) => item.department === 'Nettie').length },
          { label: 'Emailed', value: data.filter((item) => item.emailedTo).length },
        ]}
      />

      <SectionCard title="Report inventory" subtitle="Stored reports visible through Mission Control">
        <SimpleTable columns={reportColumns} rows={data} empty="No reports found." />
      </SectionCard>
    </div>
  )
}
