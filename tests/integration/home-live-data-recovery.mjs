import assert from 'assert/strict'
import fs from 'fs'
const B='http://127.0.0.1:4174';
const src=fs.readFileSync('/home/patrick/mission-control/src/pages/Home.jsx','utf8');
for(const s of ['Demo.ai Website','Q2 Budget Allocation Decision Required','Client Build Delays','Competitor product launched','Security Audit Report v2 awaiting sign-off']) assert.ok(!src.includes(s),`fake string still present: ${s}`);
const r=await fetch(B+'/api/home/summary'); const d=await r.json();
assert.equal(r.status,200); assert.ok(Array.isArray(d.quickStats)); assert.ok(Array.isArray(d.inbox)); assert.ok(Array.isArray(d.dailyWrapUp)); assert.ok(d.queue&&d.runtimeHealth&&d.reports);
assert.ok(d.truthStatus); assert.ok(d.quickStats.every(x=>x.truthStatus));
console.log('Home live data recovery tests passed');
