const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>imports[id]??require(id),Date,Error,Response,Request,URL,TextDecoder,process});return module.exports}
const deadlines=load('apps/web/lib/fitness/deadlines.ts'),agenda=load('apps/web/lib/fitness/personal-agenda.ts',{'./deadlines':deadlines}),reminders=load('apps/web/lib/fitness/personal-reminders.ts',{'./deadlines':deadlines})
const fields={titulo:'  Revisar ficha  ',descricao:'  Particular  ',data:'2026-10-23'}
assert.equal(reminders.parseReminderFields(fields).titulo,'Revisar ficha')
for(const body of [{...fields,personal_id:'forged'},{...fields,titulo:'a'},{...fields,descricao:'x'.repeat(1001)},{...fields,data:'2026-02-30'},{...fields,data:'0000-01-01'},null])assert.throws(()=>reminders.parseReminderFields(body))
const row={id:'a',...fields,concluido:false,concluido_em:null}
assert.equal(reminders.reminderEvents([row],'2026-10-24')[0].state,'Atrasado')
assert.equal(reminders.reminderEvents([{...row,concluido:true}],'2026-10-24')[0].state,'Concluído')
assert.equal(reminders.mergeReminderEvents([],[row],'2026-10-23')[0].studentId,'')
const personal='11111111-1111-4111-8111-111111111111',foreign='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333',foreignId='44444444-4444-4444-8444-444444444444'
let current=personal,role='PERSONAL',status='ATIVO',fail=false,rows=[{id:foreignId,personal_id:foreign,...fields}];const calls=[]
const db={auth:{getUser:async()=>({data:{user:current?{id:current}:null},error:null})},from(table){const ops=[];calls.push({table,ops});let patch,insert,remove=false,single=false,range
 const q={select(...args){ops.push(['select',...args]);return q},eq(k,v){ops.push(['eq',k,v]);return q},gte(k,v){ops.push(['gte',k,v]);return q},lte(k,v){ops.push(['lte',k,v]);return q},order(){return q},range(a,b){range=[a,b];return q},single(){single=true;return q},maybeSingle(){single=true;return q},upsert(value,config){insert=value;ops.push(['upsert',value,config]);return q},update(value){patch=value;return q},delete(){remove=true;return q},then(resolve,reject){
 if(table==='usuarios')return Promise.resolve({data:{tipo:role,status_conta:status},error:null}).then(resolve,reject)
 if(insert&&!rows.some(row=>row.id===insert.id))rows.push({...insert,concluido:false,concluido_em:null})
 let data=rows.filter(row=>ops.every(([op,k,v])=>op==='eq'?row[k]===v:op==='gte'?row[k]>=v:op==='lte'?row[k]<=v:true))
 if(patch)data.forEach(row=>Object.assign(row,patch));if(remove)rows=rows.filter(row=>!data.includes(row))
 if(range)data=data.slice(range[0],Math.min(range[1]+1,range[0]+137))
 return Promise.resolve({data:single?data[0]??null:data,error:fail?{code:'XX000'}:null}).then(resolve,reject)
 }};return q}}
const schema=load('packages/shared/src/schemas/index.ts'),api=load('apps/web/lib/api/fitness.ts',{'@shapeos/shared':schema,'@/lib/supabase/server':{createClient:async()=>db},'@supabase/supabase-js':{createClient:()=>db}})
const routes=Object.fromEntries(['lembretes','lembretes/[id]'].map(p=>[p,load('apps/web/app/api/'+p+'/route.ts',{'@/lib/api/fitness':api,'@/lib/fitness/personal-reminders':reminders,'@/lib/fitness/personal-agenda':agenda})]))
const request=(method='GET',body,path='lembretes?semana=2026-10-23',origin='https://shapeos.test')=>new Request('https://shapeos.test/api/'+path,{method,headers:{origin,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})
const context=value=>({params:Promise.resolve({id:value})})
;(async()=>{
 current=null;assert.equal((await routes.lembretes.GET(request())).status,401);current=personal
 for(const denied of ['ALUNO','ADMIN']){role=denied;assert.equal((await routes.lembretes.GET(request())).status,403);assert.equal((await routes.lembretes.POST(request('POST',{id,...fields}))).status,403)}role='PERSONAL'
 status='BLOQUEADO';assert.equal((await routes.lembretes.GET(request())).status,403);status='ATIVO'
 assert.equal((await routes.lembretes.POST(request('POST',{id,...fields},'lembretes','https://evil.test'))).status,403)
 assert.equal((await routes.lembretes.GET(request('GET',undefined,'lembretes?semana=2026-02-30'))).status,400)
 assert.equal((await routes.lembretes.POST(request('POST',{id,...fields}))).status,201)
 assert.equal((await routes.lembretes.POST(request('POST',{id,...fields}))).status,201);assert.equal(rows.filter(row=>row.id===id).length,1)
 assert.equal((await routes.lembretes.POST(request('POST',{id,...fields,titulo:'Mudou'}))).status,409)
 assert.equal((await routes.lembretes.POST(request('POST',{id,...fields,personal_id:foreign}))).status,400)
 assert.equal((await routes['lembretes/[id]'].PATCH(request('PATCH',{concluido:true}),context(id))).status,200);assert.equal(rows.find(row=>row.id===id).concluido,true)
 assert.equal((await routes['lembretes/[id]'].PATCH(request('PATCH',{...fields,data:'2026-10-24'}),context(id))).status,200)
 for(const payload of [{concluido:'true'},{concluido:true,personal_id:foreign},{concluido_em:'2026-01-01'}])assert.equal((await routes['lembretes/[id]'].PATCH(request('PATCH',payload),context(id))).status,400)
 assert.equal((await routes['lembretes/[id]'].PATCH(request('PATCH',{concluido:true}),context(foreignId))).status,404)
 assert.equal((await routes['lembretes/[id]'].DELETE(request('DELETE'),context(foreignId))).status,204);assert.ok(rows.some(row=>row.id===foreignId))
 rows.push(...Array.from({length:1205},(_,i)=>({id:'bulk'+i,personal_id:personal,...fields,data:'2026-10-23'})))
 const list=await routes.lembretes.GET(request());assert.equal((await list.json()).data.length,1206)
 assert.ok(calls.filter(c=>c.table==='personal_lembretes'&&!c.ops.some(([op])=>op==='upsert')).every(c=>c.ops.some(([op,k,v])=>op==='eq'&&k==='personal_id'&&v===personal)))
 fail=true;assert.equal((await routes.lembretes.GET(request())).status,500);fail=false
 assert.equal((await routes['lembretes/[id]'].DELETE(request('DELETE'),context(id))).status,204);assert.equal(rows.some(row=>row.id===id),false)
 console.log('PASS: reminder dates/limits, overdue/completed events, active owner scope, API auth/Origin, idempotent create, edits/completion, private deletes and weekly pagination beyond 1000.')
})().catch(error=>{console.error(error);process.exitCode=1})
