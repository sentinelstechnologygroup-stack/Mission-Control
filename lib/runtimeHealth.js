import { RUNTIME_TRUTH, getRuntimeTruthStatus, getOperationalConfidence } from './runtimeTruth.js'

export function buildRuntimeHealth({platformHealth={},queueSummary={},reportsStatus={},executorStatus={},reconciliation={}}={}){
  const queueStatus=getRuntimeTruthStatus({sourceType:queueSummary.sourceType||'ledger_registry',updatedAt:queueSummary.updatedAt,staleThresholdMs:15*60*1000,fallbackActive:queueSummary.fallbackActive,available:true,error:false})
  const reportStatus=getRuntimeTruthStatus({sourceType:reportsStatus.sourceType||'runtime_reports',updatedAt:reportsStatus.updatedAt,staleThresholdMs:6*60*60*1000,fallbackActive:false,available:true,error:false})
  const executorTruth=executorStatus.available===false?RUNTIME_TRUTH.DISCONNECTED:RUNTIME_TRUTH.LIVE
  const degradedSystems=[]; const staleSystems=[]; const fallbackSystems=[]; const unavailableSystems=[]
  for (const [name,status] of [['queue',queueStatus],['reports',reportStatus],['executor',executorTruth]]) { if(status===RUNTIME_TRUTH.STALE) staleSystems.push(name); if(status===RUNTIME_TRUTH.FALLBACK) fallbackSystems.push(name); if(status===RUNTIME_TRUTH.DISCONNECTED||status===RUNTIME_TRUTH.ERROR) unavailableSystems.push(name); if([RUNTIME_TRUTH.DEGRADED,RUNTIME_TRUTH.ERROR,RUNTIME_TRUTH.DISCONNECTED].includes(status)) degradedSystems.push(name) }
  if((queueSummary.staleJobs||[]).length) degradedSystems.push('stale-jobs')
  if((reportsStatus.staleCount||0)>0) staleSystems.push('stale-reports')
  const confidence=getOperationalConfidence([platformHealth.backend==='healthy'?95:35, queueStatus===RUNTIME_TRUTH.LIVE?90:50, reportStatus===RUNTIME_TRUTH.LIVE?85:45, executorTruth===RUNTIME_TRUTH.LIVE?90:30])
  return { updatedAt:new Date().toISOString(), overallHealth: unavailableSystems.length?'ERROR':(degradedSystems.length||staleSystems.length)?'DEGRADED':'HEALTHY', queueStatus, reportStatus, executorTruth, degradedSystems:[...new Set(degradedSystems)], staleSystems:[...new Set(staleSystems)], fallbackSystems:[...new Set(fallbackSystems)], unavailableSystems:[...new Set(unavailableSystems)], operationalConfidence:confidence, reconciliationWarnings:reconciliation.warnings||[] }
}
