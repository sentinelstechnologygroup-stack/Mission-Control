export function buildRuntimeReconciliation({queueSummary={},reportStatus={},snapshot={},now=new Date().toISOString()}={}){
  const warnings=[]
  if((queueSummary.totalRunning||0) > ((queueSummary.totalQueued||0)+(queueSummary.totalRunning||0)+(queueSummary.totalBlocked||0)+(queueSummary.totalCompleted||0))) warnings.push({type:'queue_count_impossible',severity:'critical'})
  if((queueSummary.staleJobs||[]).length) warnings.push({type:'stale_jobs',severity:'warning',count:queueSummary.staleJobs.length})
  if((reportStatus.staleCount||0)>0) warnings.push({type:'stale_reports',severity:'warning',count:reportStatus.staleCount})
  if(!snapshot) warnings.push({type:'missing_snapshot',severity:'warning'})
  return { updatedAt:now, ok:warnings.length===0, warnings }
}
