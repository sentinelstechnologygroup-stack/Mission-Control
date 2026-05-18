import assert from 'assert/strict'
const B='http://127.0.0.1:4174';const j=async p=>{const r=await fetch(B+p);const t=await r.text();return {r,d:t?JSON.parse(t):null}};
const q=await j('/api/queues/summary');assert.equal(q.r.status,200);assert.ok(q.d.truthStatus);assert.ok(Array.isArray(q.d.staleJobs));
const rep=await j('/api/reports/status');assert.equal(rep.r.status,200);assert.ok(typeof rep.d.staleCount==='number');assert.ok(Array.isArray(rep.d.recent));
const h=await j('/api/runtime/health');assert.equal(h.r.status,200);assert.ok(h.d.overallHealth);assert.ok(h.d.queueStatus);assert.ok(h.d.reportStatus);
const a=await j('/api/runtime/alerts');assert.equal(a.r.status,200);assert.ok(Array.isArray(a.d));
const gov=await j('/api/governance/summary');assert.equal(gov.r.status,200);assert.equal(gov.d.delegationGraph,true);
console.log('Runtime truth smoke tests passed')
