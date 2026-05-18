import assert from 'assert/strict'
import fs from 'fs'
const BASE='http://127.0.0.1:4174', ROOT='/home/patrick/mission-control'
const AGENTS=['Nettie','Van','Perry','Dana','Torina','Icky','Funboy','Rab','Novella']
const FILES=['current_objectives.json','unresolved_items.json','institutional_memory.md','recurring_failures.md','operational_patterns.md','last_runtime_snapshot.json','cross_agent_relationships.json']
for(const a of AGENTS) for(const f of FILES){const p=`${ROOT}/.agent-state/${a}/${f}`; assert.ok(fs.existsSync(p),p); if(f.endsWith('.json')) JSON.parse(fs.readFileSync(p,'utf8'))}
for(const f of ['delegation-graph.json','capability-matrix.json','skill-registry.json']) JSON.parse(fs.readFileSync(`${ROOT}/governance/${f}`,'utf8'))
const res=await fetch(`${BASE}/api/agents/nettie`), data=await res.json(); assert.equal(res.status,200); assert.ok(data.agentFilesystem); assert.ok(data.agentState); assert.equal(data.agentState.complete,true); assert.ok(!JSON.stringify(data).match(/api[_-]?key"\s*:|bearer[_-]?token"\s*:|openai[_-]?key"\s*:|secretKey"\s*:/i))
console.log('Agent state foundation tests passed')
