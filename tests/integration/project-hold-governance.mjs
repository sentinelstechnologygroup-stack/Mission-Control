import assert from 'assert/strict'
const create=await fetch('http://127.0.0.1:4174/api/local-bridge/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({owner:'Icky',task:'Healthcare Teams-to-Zoho Message Logging Middleware validation hold'})})
const created=await create.json();assert.ok(create.status===200||create.status===201)
const apply=await fetch('http://127.0.0.1:4174/api/projects/holds/apply',{method:'POST'})
const a=await apply.json();assert.equal(apply.status,200);assert.ok(Array.isArray(a.transitioned));
console.log('project hold governance tests passed')