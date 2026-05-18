import assert from 'assert/strict'
import fs from 'fs'
import path from 'path'

const BASE='http://127.0.0.1:4174'
const ROOT='/home/patrick/mission-control/.agents'
const REQUIRED=['agent.md','AGENTS.md','dependencies.md','handoffs.md','IDENTITY.md','LOGIC.md','MEMORY.md','ownership.md','prompt.md','SOUL.md','TASKS.md','TOOLS.md']
const EXECUTIVE=['Nettie','Van','Perry','Dana','Torina','Icky','Funboy','Rab']

async function req(pathname){
  const res=await fetch(BASE+pathname)
  const text=await res.text();let data
  try{data=text?JSON.parse(text):null}catch{data=text}
  return {res,data}
}

function checkAgentDir(name){
  const dir=path.join(ROOT,name)
  assert.ok(fs.existsSync(dir),`${name} dir missing`)
  for(const file of REQUIRED){
    const p=path.join(dir,file)
    assert.ok(fs.existsSync(p),`${name} missing ${file}`)
    assert.ok(fs.statSync(p).size>0,`${name} empty ${file}`)
  }
}

async function main(){
  for(const name of EXECUTIVE) checkAgentDir(name)
  checkAgentDir('Novella')

  assert.ok(fs.existsSync('/home/patrick/mission-control/.codex/agents/novella.toml'),'novella codex config missing')

  const {res,data}=await req('/api/agents')
  assert.equal(res.status,200)
  const byId=Object.fromEntries(data.map(a=>[a.id,a]))
  for(const id of ['nettie','van','perry','dana','torina','icky','funboy','rab']){
    assert.ok(byId[id],`registry missing ${id}`)
    assert.ok(byId[id].agentFilesystem,`${id} missing agentFilesystem`)
    assert.equal(byId[id].agentFilesystem.complete,true,`${id} agentFilesystem incomplete`)
    assert.ok(byId[id].agentFilesystem.surfaces.identity.length>20,`${id} identity unreadable`)
    assert.ok(byId[id].agentFilesystem.surfaces.ownership.length>20,`${id} ownership unreadable`)
    assert.ok(byId[id].agentFilesystem.surfaces.handoffs.length>20,`${id} handoffs unreadable`)
    assert.ok(byId[id].agentFilesystem.surfaces.tools.length>10,`${id} tools unreadable`)
  }

  const {res:res2,data:data2}=await req('/api/agents/nettie')
  assert.equal(res2.status,200)
  assert.equal(data2.id,'nettie')
  assert.ok(data2.agentFilesystem.files.includes('AGENTS.md'))
  assert.ok(data2.agentFilesystem.files.includes('IDENTITY.md'))

  console.log('Agent filesystem standardization tests passed')
}

main().catch(err=>{console.error(err);process.exit(1)})
