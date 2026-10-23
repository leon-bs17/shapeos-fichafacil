const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>imports[id]??require(id),Date,Error,AbortController,URLSearchParams});return exports}
const deadlines=load('apps/web/lib/fitness/deadlines.ts'),helpers=load('apps/web/lib/fitness/personal-agenda.ts',{'./deadlines':deadlines})
for(const date of ['2026-01-01','2024-02-29','2026-03-08','2026-11-01','2026-10-25']){
 const w=helpers.weekWindow(date)
 assert.equal(w.days.length,7);assert.equal(new Date(w.start+'T12:00:00').getDay(),1)
 assert.equal(new Date(w.end+'T12:00:00').getDay(),0);assert.ok(w.start<=date&&date<=w.end)
 assert.equal(new Date(w.startIso).getHours(),0);assert.equal(new Date(w.endExclusiveIso).getHours(),0)
 assert.equal(helpers.moveWeek(helpers.moveWeek(date,1),-1),w.start)
}
assert.throws(()=>helpers.weekWindow('2026-02-30'));assert.throws(()=>helpers.weekWindow('invalid'))
const now=new Date(2026,9,23,15),week=helpers.weekWindow('2026-10-23')
const students=[{id:'s1',name:'Ana',nextAssessment:'2026-10-22',latestAssessment:'2026-10-23'},{id:'s2',name:'Bia',nextAssessment:'2026-10-21',latestAssessment:'2026-10-20'},{id:'s3',name:'Caio',nextAssessment:'2026-11-01',latestAssessment:null}]
const planned=[{id:'p1',aluno_id:'s1',treino_id:'t1',data:'2026-10-22',ficha:{titulo:'Força',ativo:true}},{id:'p2',aluno_id:'s2',treino_id:'t1',data:'2026-10-22',ficha:{titulo:'Força',ativo:false}},{id:'future',aluno_id:'s1',treino_id:'t1',data:'2026-10-25',ficha:{titulo:'Futuro',ativo:true}},{id:'foreign',aluno_id:'outside',treino_id:'t1',data:'2026-10-22',ficha:{titulo:'Foreign',ativo:true}},{id:'old',aluno_id:'s1',treino_id:'t1',data:'2026-10-18',ficha:{titulo:'Old',ativo:true}}]
const sessions=[{aluno_id:'s1',treino_id:'t1',inicio:new Date(2026,9,22,12).toISOString(),status:'CONCLUIDO'},{aluno_id:'s1',treino_id:'t1',inicio:new Date(2026,9,25,12).toISOString(),status:'CONCLUIDO'}]
const events=helpers.agendaEvents(students,planned,sessions,week.start,now)
assert.equal(events.length,5)
assert.equal(events.find(e=>e.id==='treino:p1').state,'Realizado')
assert.equal(events.find(e=>e.id==='treino:p2').state,'Sem sessão registrada')
assert.match(events.find(e=>e.id==='treino:p2').title,/pausada/)
assert.equal(events.find(e=>e.id==='treino:future').state,'Planejado')
assert.equal(events.find(e=>e.id==='avaliacao:s1').state,'Registrada')
assert.equal(events.find(e=>e.id==='avaliacao:s2').state,'Pendente')
assert.ok(events.every(e=>e.href.includes('aluno=')&&e.href.includes('aba=')))
function setup(options={}){
 const calls=[],members=Array.from({length:53},(_,i)=>({id:'s'+i,nome:'Aluno '+i,vinculos:[{proxima_avaliacao_em:null}],avaliacoes:[]}))
 const plans=Array.from({length:1205},(_,i)=>({id:'p'+i,aluno_id:'s0',treino_id:'t0',data:week.start,ficha:{titulo:'Ficha',ativo:true}}))
 const db={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'personal-own'}},error:null})},from(table){
  const call={table,filters:[],orders:[]};calls.push(call)
  const q={select(fields){call.fields=fields;return q},eq(k,v){call.filters.push(['eq',k,v]);return q},in(k,v){call.filters.push(['in',k,v]);return q},gte(k,v){call.filters.push(['gte',k,v]);return q},lte(k,v){call.filters.push(['lte',k,v]);return q},lt(k,v){call.filters.push(['lt',k,v]);return q},order(k,v){call.orders.push([k,v]);return q},limit(n,config){call.limit={n,config};return q},range(a,b){call.range=[a,b];return q},abortSignal(s){call.signal=s;return q},then(resolve,reject){
   let data=[]
   if(table==='usuarios')data=options.empty?[]:members.slice(call.range[0],call.range[0]+17)
   if(table==='agenda_treino'&&call.filters.find(([op,k])=>op==='in'&&k==='aluno_id')[2].includes('s0'))data=plans.slice(call.range[0],call.range[0]+137)
   return Promise.resolve({data,error:options.errorTable===table?Error('db'):null}).then(resolve,reject)
  }};return q
 }}
 return {...load('apps/web/services/personal-agenda.ts',{'@/lib/supabase/client':{createClient:()=>db},'@/lib/fitness/deadlines':deadlines,'@/lib/fitness/personal-agenda':helpers}),calls}
}
;(async()=>{
 const api=setup(),controller=new AbortController(),data=await api.fetchPersonalAgenda(week.start,controller.signal)
 assert.equal(data.students.length,53);assert.equal(data.events.length,1205)
 assert.ok(api.calls.every(c=>c.signal===controller.signal))
 const links=api.calls.filter(c=>c.table==='usuarios')
 assert.ok(links.every(c=>c.filters.some(([op,k,v])=>op==='eq'&&k==='vinculos.personal_id'&&v==='personal-own')))
 assert.ok(links.every(c=>c.filters.some(([op,k,v])=>op==='eq'&&k==='vinculos.status'&&v==='ATIVO')))
 assert.ok(links.every(c=>c.limit.n===1&&c.limit.config.referencedTable==='avaliacoes'))
 const child=api.calls.filter(c=>c.table!=='usuarios')
 assert.ok(child.every(c=>c.filters.some(([op,k,v])=>op==='eq'&&k==='ficha.personal_id'&&v==='personal-own')))
 assert.ok(child.every(c=>c.filters.some(([op,k,v])=>op==='in'&&k==='aluno_id'&&v.length<=50)))
 assert.ok(child.every(c=>c.fields.includes('!inner')))
 const agendas=child.filter(c=>c.table==='agenda_treino'),history=child.filter(c=>c.table==='sessoes_treino')
 assert.ok(agendas.every(c=>c.filters.some(([op,k,v])=>op==='gte'&&k==='data'&&v===week.start)))
 assert.ok(agendas.every(c=>c.filters.some(([op,k,v])=>op==='lte'&&k==='data'&&v===week.end)))
 assert.ok(history.every(c=>c.filters.some(([op,k,v])=>op==='lt'&&k==='inicio'&&v===week.endExclusiveIso)))
 assert.ok(child.every(c=>!c.fields.includes('prescricao')&&!c.fields.includes('series')&&!c.fields.includes('peso')))
 const empty=setup({empty:true});assert.equal((await empty.fetchPersonalAgenda(week.start)).events.length,0);assert.equal(empty.calls.length,1)
 const noUser=setup({noUser:true});await assert.rejects(noUser.fetchPersonalAgenda(week.start));assert.equal(noUser.calls.length,0)
 for(const table of ['usuarios','agenda_treino','sessoes_treino'])await assert.rejects(setup({errorTable:table}).fetchPersonalAgenda(week.start))
 console.log('PASS: weekly calendar/DST, student/workout identity, future sessions, assessment completion, active owner scope, small ID batches, pagination beyond 1000, errors and cancellation.')
})().catch(e=>{console.error(e);process.exitCode=1})
