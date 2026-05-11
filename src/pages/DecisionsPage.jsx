import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader, SectionCard, SimpleTable, StatusPill } from '@/components/mission-control/LiveDataViews'

export default function DecisionsPage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['decisions'],
    queryFn: api.decisions,
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Memory / Decisions" subtitle={isLoading ? 'Loading decisions…' : isError ? 'Decisions unavailable.' : 'Standing authorizations, routing rules, outage decisions, and remembered operational state.'} />
      <SectionCard title="Decision ledger" subtitle="Current stored decisions and active operational rules">
        <SimpleTable
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'decision', label: 'Decision' },
            { key: 'reason', label: 'Reason' },
            { key: 'owner', label: 'Owner' },
            { key: 'project', label: 'Project' },
            { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
          ]}
          rows={data}
          empty="No decisions recorded."
        />
      </SectionCard>
    </div>
  )
}
