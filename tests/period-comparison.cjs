const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>imports[id]??require(id),Date,Error,AbortController});return exports}
const deadlines=load('apps/web/lib/fitness/deadlines.ts')
const helpers=load('apps/web/lib/fitness/period-comparison.ts',{'./deadlines':deadlines})
for(const now of [new Date(2026,9,23,0,1),new Date(2026,0,1,23,59),new Date(2024,2,1,0,1),new Date(2026,2,9,0,5),new Date(2026,10,2,23,59)])for(const n of [7,30,90]){
 const w=helpers.comparisonWindows(n,now),current=new Date(w.start),previous=new Date(w.previousStart)
 const expected=new Date(now);expected.setHours(0,0,0,0);expected.setDate(expected.getDate()-n+1)
 assert.equal(current.toISOString(),expected.toISOString());expected.setDate(expected.getDate()-n)
 assert.equal(previous.toISOString(),expected.toISOString());assert.equal(w.end,now.toISOString())
 assert.equal(w.startDate,deadlines.localCalendarDate(current))
 assert.equal(w.previousEndDate,deadlines.localCalendarDate(new Date(current.getTime()-1)))
}
assert.throws(()=>helpers.comparisonWindows(8),/inválido/)
const window=helpers.comparisonWindows(7,new Date(2026,9,23,15))
function session(id,inicio,load,item='item-'+id){return {id,inicio,status:'CONCLUIDO',prescricao:[{id:item,exercicio_id:'same-exercise',nome:'Agachamento'}],series:[{item_id:item,carga:load,reps:10,aquecimento:false}]}}
const previous=session('p',window.previousStart,20)
const current=session('c',window.start,30)
current.series.push({item_id:'item-c',carga:999,reps:10,aquecimento:true},{item_id:'unknown',carga:999,reps:10,aquecimento:false},{item_id:'item-c',carga:999,reps:null,aquecimento:false})
const result=helpers.comparePeriods([previous,current,session('future',new Date(Date.parse(window.end)+1).toISOString(),999),{...current,id:'pending',status:'EM_ANDAMENTO'},session('old',new Date(Date.parse(window.previousStart)-1).toISOString(),999)],window)
assert.equal(result.current.sessions,1);assert.equal(result.previous.sessions,1)
assert.equal(result.current.volume,300);assert.equal(result.previous.volume,200)
assert.equal(result.exercises.length,1);assert.equal(result.exercises[0].current,30);assert.equal(result.exercises[0].previous,20)
assert.equal(helpers.difference(null,0),null);assert.equal(helpers.difference(0,5),-5)
assert.equal(helpers.summarizePeriod([session('null',window.start,null)]).volume,null)
assert.equal(helpers.summarizePeriod([session('zero',window.start,0)]).volume,0)
assert.equal(helpers.summarizePeriod([current,{...current,id:'same-day'}]).trainingDays,1)
function setup(options={}){
 const calls=[],records=Array.from({length:1305},(_,i)=>session(String(i),window.start,10))
 const db={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'personal'}},error:null})},from(table){
  const call={table,filters:[],orders:[]};calls.push(call)
  const q={select(fields){call.fields=fields;return q},eq(k,v){call.filters.push(['eq',k,v]);return q},gte(k,v){call.filters.push(['gte',k,v]);return q},lte(k,v){call.filters.push(['lte',k,v]);return q},order(k,v){call.orders.push([k,v]);return q},limit(n){call.limit=n;return q},range(a,b){call.range=[a,b];return q},abortSignal(s){call.signal=s;return q},maybeSingle(){return q},then(resolve,reject){
   let response
   if(table==='personal_alunos')response={data:options.unlinked?null:{status:options.inactive?'INATIVO':'ATIVO'},error:options.linkError?Error('db'):null}
   else if(table==='avaliacoes_fisicas')response={data:[],error:options.assessmentError?Error('db'):null}
   else response={data:options.empty?[]:records.slice(call.range[0],call.range[0]+137),error:options.sessionError?Error('db'):null}
   return Promise.resolve(response).then(resolve,reject)
  }};return q
 }}
 return {...load('apps/web/services/period-comparison.ts',{'@/lib/supabase/client':{createClient:()=>db},'@/lib/fitness/period-comparison':helpers}),calls}
}
;(async()=>{
 const api=setup(),controller=new AbortController(),data=await api.fetchPeriodComparison('student',30,controller.signal)
 assert.equal(data.sessions.length,1305);assert.equal(new Set(data.sessions.map(s=>s.id)).size,1305)
 assert.equal(data.currentAssessment,null);assert.equal(data.previousAssessment,null)
 assert.ok(api.calls.every(c=>c.signal===controller.signal))
 assert.ok(api.calls.every(c=>c.filters.some(([op,k,v])=>op==='eq'&&k==='aluno_id'&&v==='student')))
 assert.ok(api.calls[0].filters.some(([op,k,v])=>op==='eq'&&k==='personal_id'&&v==='personal'))
 const sessions=api.calls.filter(c=>c.table==='sessoes_treino')
 assert.ok(sessions.length>2);assert.ok(sessions.every(c=>c.filters.some(([op,k,v])=>op==='eq'&&k==='status'&&v==='CONCLUIDO')))
 assert.ok(sessions.every(c=>c.filters.some(([op,k,v])=>op==='gte'&&k==='inicio'&&v===data.window.previousStart)))
 assert.ok(sessions.every(c=>c.filters.some(([op,k,v])=>op==='lte'&&k==='inicio'&&v===data.window.end)))
 assert.ok(sessions.every(c=>c.orders.length===2));assert.equal(sessions[1].range[0],137)
 const assessments=api.calls.filter(c=>c.table==='avaliacoes_fisicas')
 assert.equal(assessments.length,2);assert.ok(assessments.every(c=>c.limit===1&&!c.fields.includes('foto')))
 for(const options of [{unlinked:true},{inactive:true},{linkError:true}]){const denied=setup(options);await assert.rejects(denied.fetchPeriodComparison('student',30));assert.equal(denied.calls.length,1)}
 const noUser=setup({noUser:true});await assert.rejects(noUser.fetchPeriodComparison('student',30));assert.equal(noUser.calls.length,0)
 await assert.rejects(setup().fetchPeriodComparison('',30));await assert.rejects(setup().fetchPeriodComparison('student',8))
 await assert.rejects(setup({sessionError:true}).fetchPeriodComparison('student',30),/sessões/)
 await assert.rejects(setup({assessmentError:true}).fetchPeriodComparison('student',30),/medidas/)
 assert.equal((await setup({empty:true}).fetchPeriodComparison('student',7)).sessions.length,0)
 console.log('PASS: calendar periods, DST/leap year, boundaries, stable exercise identity, warmups, missing/zero data, ownership, pagination beyond 1000, cancellation and error handling.')
})().catch(error=>{console.error(error);process.exitCode=1})
