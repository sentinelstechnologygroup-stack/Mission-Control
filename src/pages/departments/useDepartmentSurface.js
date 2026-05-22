import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

export function useDepartmentSurfaceData(departmentId = null, { overview = false } = {}) {
  const isOverview = overview || !departmentId

  const workflowRegistryQuery = useQuery({
    queryKey: ['departments', 'workflows'],
    queryFn: api.departmentsWorkflows,
    refetchInterval: 10000,
  })

  const departmentListQuery = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: api.departments,
    enabled: isOverview,
    refetchInterval: 10000,
  })

  const departmentQuery = useQuery({
    queryKey: ['departments', departmentId],
    queryFn: () => api.department(departmentId),
    enabled: Boolean(departmentId),
    refetchInterval: 10000,
  })

  const queueSummaryQuery = useQuery({
    queryKey: ['departments', 'queue-summary'],
    queryFn: api.queueSummary,
    refetchInterval: 10000,
  })

  const runtimeHealthQuery = useQuery({
    queryKey: ['departments', 'runtime-health'],
    queryFn: api.runtimeHealth,
    refetchInterval: 10000,
  })

  const executorEvidenceQuery = useQuery({
    queryKey: ['departments', 'executor-evidence'],
    queryFn: api.executorEvidence,
    refetchInterval: 10000,
  })

  const recentActivityQuery = useQuery({
    queryKey: ['departments', 'activity-recent'],
    queryFn: api.activityRecent,
    refetchInterval: 10000,
  })

  const jobsSummaryQuery = useQuery({
    queryKey: ['departments', 'jobs-summary'],
    queryFn: api.jobsSummary,
    refetchInterval: 10000,
  })

  const executorStatusQuery = useQuery({
    queryKey: ['departments', 'executor-status'],
    queryFn: api.executorStatus,
    retry: false,
    refetchInterval: 10000,
  })

  const systemQuery = useQuery({
    queryKey: ['departments', 'system'],
    queryFn: api.system,
    refetchInterval: 10000,
  })

  const departments = useMemo(() => safeArray(workflowRegistryQuery.data?.departments), [workflowRegistryQuery.data?.departments])

  const selectedDepartment = useMemo(() => {
    if (!departmentId) return null
    const fromDepartment = departmentQuery.data || null
    if (fromDepartment && Object.keys(fromDepartment).length) return fromDepartment
    return departments.find((item) => item.id === departmentId || item.name?.toLowerCase?.() === departmentId) || null
  }, [departmentId, departmentQuery.data, departments])

  return {
    isOverview,
    workflowRegistry: workflowRegistryQuery.data || {},
    departmentList: departmentListQuery.data || [],
    department: selectedDepartment,
    queueSummary: queueSummaryQuery.data || {},
    runtimeHealth: runtimeHealthQuery.data || {},
    executorEvidence: executorEvidenceQuery.data || {},
    recentActivity: recentActivityQuery.data || [],
    jobsSummary: jobsSummaryQuery.data || {},
    executorStatus: executorStatusQuery.data || {},
    systemTruth: systemQuery.data || {},
    queries: {
      workflowRegistry: workflowRegistryQuery,
      departmentList: departmentListQuery,
      department: departmentQuery,
      queueSummary: queueSummaryQuery,
      runtimeHealth: runtimeHealthQuery,
      executorEvidence: executorEvidenceQuery,
      recentActivity: recentActivityQuery,
      jobsSummary: jobsSummaryQuery,
      executorStatus: executorStatusQuery,
      systemTruth: systemQuery,
    },
  }
}
