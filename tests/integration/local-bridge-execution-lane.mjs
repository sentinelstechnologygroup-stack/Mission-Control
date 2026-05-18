import assert from 'assert/strict'

const BASE='http://127.0.0.1:4174'
const req=async(path,opt={})=>{const r=await fetch(BASE+path,opt);const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}return{r,d}}

async function createJob(){
  const {r,d}=await req('/api/local-bridge/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:'Van',task:'Syntax check Mission Control',projectPath:'/home/patrick/mission-control',commands:['node --check server.js'],autoExecute:false})})
  assert.ok(r.status===200||r.status===201)
  assert.equal(d.job.owner,'Van')
  return d.job.id||d.job.jobId
}

async function main(){
  const jobId=await createJob()
  let x=await req('/api/local-bridge/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'itest-bridge'})})
  assert.equal(x.r.status,200)
  assert.equal(x.d.job.id||x.d.job.jobId,jobId)

  x=await req(`/api/local-bridge/jobs/${jobId}/heartbeat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'itest-bridge'})})
  assert.equal(x.r.status,200)

  x=await req(`/api/local-bridge/jobs/${jobId}/complete`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'itest-bridge',result:{ok:true}})})
  assert.equal(x.r.status,422)

  const risk=await req('/api/local-bridge/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:'Van',task:'Risk test',projectPath:'/home/patrick/mission-control',commands:['printf auth-secret-deployment-risk'],autoExecute:false})})
  assert.equal(risk.r.status,201)
  const riskId=risk.d.job.id||risk.d.job.jobId
  x=await req(`/api/local-bridge/jobs/${riskId}/fail`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'itest-bridge',evidence:{checks:[{name:'risk',stdout:'auth secret deployment risk',stderr:'',exitCode:1}]}})})
  assert.ok(x.r.status===200||x.r.status===202)
  assert.equal(x.d.perryReviewRequired,true)

  const stale=await req('/api/local-bridge/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:'Van',task:'Stale test',projectPath:'/home/patrick/mission-control',commands:['pwd'],autoExecute:false})})
  const staleId=stale.d.job.id||stale.d.job.jobId
  await req('/api/local-bridge/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'stale-bridge',preferredJobId:staleId})})
  x=await req('/api/local-bridge/reconcile-stale',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({staleAfterMs:0})})
  assert.ok((x.d.updatedJobIds||[]).includes(staleId))

  const run=await req('/api/local-bridge/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:'Van',task:'Syntax check Mission Control',projectPath:'/home/patrick/mission-control',commands:['node --check server.js'],autoExecute:false})})
  const runId=run.d.job.id||run.d.job.jobId
  x=await req('/api/local-bridge/run-next',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'runner',preferredJobId:runId})})
  assert.equal(x.r.status,200)
  assert.ok(x.d.job.outputPayload)
  assert.ok(Array.isArray(x.d.job.outputPayload.evidence.checks))

  const dup=await req('/api/local-bridge/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bridgeId:'runner',preferredJobId:runId})})
  assert.ok(dup.r.status===404||dup.r.status===409)

  const live=await req('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Nettie, have Van run CI on Mission Control and report failures to Perry.'})})
  assert.ok(live.r.status===200||live.r.status===201||live.r.status===202)
  const liveJobId=(live.d.createdJob&& (live.d.createdJob.id||live.d.createdJob.jobId)) || (live.d.job&&live.d.job.jobId)
  assert.ok(liveJobId)
  let final=await req(`/api/jobs/${liveJobId}`)
  assert.equal(final.r.status,200)
  assert.equal(final.d.owner,'Van')
  console.log('Local bridge execution lane tests passed')
}

main().catch(err=>{console.error(err);process.exit(1)})
