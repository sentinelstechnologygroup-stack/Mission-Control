import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader, SectionCard, SimpleTable, StatusPill } from '@/components/mission-control/LiveDataViews'

export default function IntegrationsPage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['integrations'],
    queryFn: api.integrations,
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Integrations" subtitle={isLoading ? 'Loading integrations…' : isError ? 'Integrations unavailable.' : 'Telegram, Gmail, GitHub, Vercel, and local executor connectors.'} />
      <SectionCard title="Integration registry" subtitle="Current connector visibility in Mission Control">
        <SimpleTable
          columns={[
            { key: 'name', label: 'Integration' },
            { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
            { key: 'detail', label: 'Detail' },
            { key: 'target', label: 'Target' },
          ]}
          rows={data}
          empty="No integrations detected."
        />
      </SectionCard>
    </div>
  )
}
