import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { MetricGrid, PageHeader, SectionCard, SimpleTable, StatusPill, KeyValueList } from '@/components/mission-control/LiveDataViews'

const usageColumns = [
  { key: 'provider', label: 'Provider' },
  { key: 'model', label: 'Model' },
  { key: 'modelVersion', label: 'Version' },
  { key: 'taskType', label: 'Task Type' },
  { key: 'inputTokens', label: 'Input Tokens' },
  { key: 'outputTokens', label: 'Output Tokens' },
  { key: 'totalTokens', label: 'Total Tokens' },
  { key: 'estimatedCost', label: 'Estimated Cost' },
  { key: 'startedAt', label: 'Started' },
  { key: 'completedAt', label: 'Completed' },
  { key: 'duration', label: 'Duration' },
  { key: 'jobId', label: 'Job ID' },
  { key: 'department', label: 'Department' },
  { key: 'project', label: 'Project' },
  { key: 'notes', label: 'Notes' },
]

export default function CostsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['costs'],
    queryFn: api.costs,
    refetchInterval: 30000,
  })

  const summary = data?.summary || {}
  const usageRows = data?.usageRows || []
  const cooldown = data?.cooldown || {}
  const burnRate = data?.burnRate || {}
  const modelChangeLog = data?.modelChangeLog || []
  const costByDepartment = data?.costByDepartment || []
  const costByWorkType = data?.costByWorkType || []

  return (
    <div className="space-y-4">
      <PageHeader title="Token Burn Rate / AI Cost" subtitle={isLoading ? 'Loading AI usage state…' : isError ? 'AI cost data unavailable.' : summary.source || 'Provider/model state with partial telemetry.'} />

      <MetricGrid
        items={[
          { label: 'Active provider', value: summary.activeProvider || '—' },
          { label: 'Active model', value: summary.activeModel || '—' },
          { label: 'Model version', value: summary.activeModelVersion || '—' },
          { label: 'Confidence', value: summary.confidence || '—', sub: summary.lastUpdated || '—' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Current usage summary" subtitle="Actual tracked data where available; otherwise clearly marked unavailable.">
          <KeyValueList
            items={[
              { label: 'Current session token estimate', value: summary.currentSessionTokenEstimate ?? 'Unavailable' },
              { label: 'Today total token use', value: summary.todayTotalTokenUse ?? 'Unavailable' },
              { label: 'Weekly token use', value: summary.weeklyTokenUse ?? 'Unavailable' },
              { label: 'Monthly token use', value: summary.monthlyTokenUse ?? 'Unavailable' },
              { label: 'Estimated cost today', value: summary.estimatedCostToday ?? 'Unavailable' },
              { label: 'Estimated cost this week', value: summary.estimatedCostThisWeek ?? 'Unavailable' },
              { label: 'Estimated cost this month', value: summary.estimatedCostThisMonth ?? 'Unavailable' },
              { label: 'Source', value: summary.source || 'Unavailable' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Cooldown panel" subtitle="Cooldown and fallback safety">
          <KeyValueList
            items={[
              { label: 'Provider', value: cooldown.provider },
              { label: 'Model', value: cooldown.model },
              { label: 'Cooldown status', value: cooldown.cooldownStatus },
              { label: 'Cooldown started', value: cooldown.cooldownStarted || '—' },
              { label: 'Estimated reset time', value: cooldown.estimatedResetTime || '—' },
              { label: 'Known limit type', value: cooldown.knownLimitType || '—' },
              { label: 'Next recommended model', value: cooldown.nextRecommendedModel || '—' },
              { label: 'Fallback safe', value: cooldown.fallbackSafe ? 'yes' : 'no' },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Burn rate panel" subtitle="No fake precision when token telemetry is missing.">
          <KeyValueList
            items={[
              { label: 'Tokens per minute', value: burnRate.tokensPerMinute ?? 'Unavailable' },
              { label: 'Tokens per hour', value: burnRate.tokensPerHour ?? 'Unavailable' },
              { label: 'Estimated time until cap', value: burnRate.estimatedTimeUntilCap ?? 'Unavailable' },
              { label: 'High-use warning', value: burnRate.highUseWarning || '—' },
              { label: 'Recommended pause window', value: burnRate.recommendedPauseWindow || '—' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Scheduling recommendation" subtitle="Batching guidance for expensive work">
          <ul className="space-y-2 text-[10px] text-white/45">
            {(data?.schedulingRecommendation || []).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Model usage table" subtitle="Per-execution rows with explicit confidence notes">
        <SimpleTable columns={usageColumns} rows={usageRows} empty="No usage rows have been recorded yet." />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Model-change log" subtitle="No model switching without logging">
          <SimpleTable
            columns={[
              { key: 'priorModel', label: 'Prior model' },
              { key: 'newModel', label: 'New model' },
              { key: 'changeSummary', label: 'Change summary' },
              { key: 'reason', label: 'Reason' },
              { key: 'scope', label: 'Scope' },
              { key: 'date', label: 'Date' },
              { key: 'owner', label: 'Owner' },
            ]}
            rows={modelChangeLog}
            empty="No model-change log entries found." 
          />
        </SectionCard>
        <SectionCard title="Cost by department / work type" subtitle="Tracking status remains explicit until a native meter exists.">
          <div className="grid gap-4 md:grid-cols-2">
            <SimpleTable
              columns={[
                { key: 'department', label: 'Department' },
                { key: 'estimatedCost', label: 'Cost' },
                { key: 'trackedJobs', label: 'Tracked jobs' },
                { key: 'trackingStatus', label: 'Status', render: (row) => <StatusPill status={row.trackingStatus} /> },
              ]}
              rows={costByDepartment}
              empty="No department cost rows available."
            />
            <SimpleTable
              columns={[
                { key: 'workType', label: 'Work type' },
                { key: 'estimatedCost', label: 'Cost' },
                { key: 'trackingStatus', label: 'Status', render: (row) => <StatusPill status={row.trackingStatus} /> },
              ]}
              rows={costByWorkType}
              empty="No work-type cost rows available."
            />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
