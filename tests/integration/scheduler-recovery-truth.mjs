import assert from 'assert/strict'
for (const p of ['http://127.0.0.1:4174/api/reports/execution-health','http://127.0.0.1:4174/api/runtime/startup-health']) { const r=await fetch(p); const d=await r.json(); assert.equal(r.status,200); assert.ok(d.truthStatus); }
console.log('scheduler recovery truth tests passed')