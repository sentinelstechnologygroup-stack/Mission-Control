export const RUNTIME_TRUTH = { LIVE:'LIVE', FALLBACK:'FALLBACK', STATIC:'STATIC', STALE:'STALE', DEGRADED:'DEGRADED', ERROR:'ERROR', SIMULATED:'SIMULATED', DISCONNECTED:'DISCONNECTED', UNKNOWN:'UNKNOWN' }

export function getFreshnessAge(updatedAt){ const ms=Date.parse(updatedAt||''); return Number.isFinite(ms)?Math.max(0,Date.now()-ms):null }
export function isDataFresh(updatedAt,staleThresholdMs=300000){ const age=getFreshnessAge(updatedAt); return age===null?false:age<=staleThresholdMs }
export function isFallbackMode(v){ return Boolean(v) }
export function isStaticMode(sourceType=''){ return /static|mock|demo|seed|placeholder/i.test(String(sourceType||'')) }
export function getRuntimeTruthStatus({sourceType='unknown',updatedAt=null,staleThresholdMs=300000,fallbackActive=false,available=true,simulated=false,error=false}={}){ if(error) return RUNTIME_TRUTH.ERROR; if(!available) return RUNTIME_TRUTH.DISCONNECTED; if(simulated) return RUNTIME_TRUTH.SIMULATED; if(fallbackActive) return RUNTIME_TRUTH.FALLBACK; if(isStaticMode(sourceType)) return RUNTIME_TRUTH.STATIC; if(updatedAt && !isDataFresh(updatedAt,staleThresholdMs)) return RUNTIME_TRUTH.STALE; if(sourceType==='live' || /runtime|ledger|registry|api|file/i.test(String(sourceType))) return RUNTIME_TRUTH.LIVE; return RUNTIME_TRUTH.UNKNOWN }
export function getTruthClassification(opts={}){ return getRuntimeTruthStatus(opts) }
export function getOperationalConfidence(items=[]){ const vals=(items||[]).filter(Boolean); if(!vals.length) return {score:0,label:'UNKNOWN'}; const score=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length); return {score,label:score>=85?'HIGH':score>=60?'MEDIUM':score>=35?'LOW':'MINIMAL'} }
