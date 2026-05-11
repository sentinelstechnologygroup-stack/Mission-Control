import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PageHeader, SectionCard, SimpleTable, StatusPill, LinkButton } from '@/components/mission-control/LiveDataViews'

export default function ProjectsPage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects,
    refetchInterval: 30000,
  })

  return (
    <div className="space-y-4">
      <PageHeader title="Project Registry" subtitle={isLoading ? 'Loading project registry…' : isError ? 'Project registry unavailable.' : 'Tracked STG / SDL local projects and inferred runtime state.'} actions={<LinkButton to="/departments/van">Van office</LinkButton>} />
      <SectionCard title="Projects" subtitle="Local path, ports, repo, and next action visibility">
        <SimpleTable
          columns={[
            { key: 'projectName', label: 'Project' },
            { key: 'projectType', label: 'Type' },
            { key: 'localPath', label: 'Local Path' },
            { key: 'frontendStatus', label: 'Frontend', render: (row) => <StatusPill status={row.frontendStatus} /> },
            { key: 'backendStatus', label: 'Backend', render: (row) => <StatusPill status={row.backendStatus} /> },
            { key: 'currentBranch', label: 'Branch' },
            { key: 'liveUrl', label: 'Live URL' },
            { key: 'owner', label: 'Owner' },
            { key: 'nextAction', label: 'Next Action' },
          ]}
          rows={data}
          empty="No projects discovered."
        />
      </SectionCard>
    </div>
  )
}
