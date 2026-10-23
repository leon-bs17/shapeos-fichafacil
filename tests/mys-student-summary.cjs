const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={},extra={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>imports[id]??require(id),Date,Error,Response,Request,URL,TextDecoder,AbortSignal,process,...extra});return module.exports}
const summary=load('apps/web/lib/mys/student-summary.ts'),contract=load('apps/web/lib/mys/contract.ts')
const dataTools=load('apps/web/lib/mys/data-tools.ts',{'./student-summary':summary})
const student='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
assert.equal(contract.parseMysStudent({messages:[]}),undefined)
assert.equal(contract.parseMysStudent({studentId:student}),student)
for(const id of ['',null,{},'invalid',12])assert.throws(()=>contract.parseMysStudent({studentId:id}))
function setup(options={}){
 const calls=[];let countIndex=0
 const db={from(table){const call={table,ops:[]};calls.push(call);const q={}
 for(const method of ['select','eq','gte','lte','order','limit','abortSignal','maybeSingle','ilike'])q[method]=(...args)=>{call.ops.push([method,...args]);return q}
 q.then=(resolve,reject)=>{
  let data=[],count=0
  if(table==='personal_alunos')data=options.unlinked?null:{aluno_id:student,proxima_avaliacao_em:'2026-11-05'}
  if(table==='usuarios')data={id:student,nome:'Aluno selecionado'}
  if(table==='sessoes_treino'){
   if(call.ops.some(([op])=>op==='select'&&call.ops.find(([name])=>name==='select')[2]?.head))count=options.nullCount?null:options.empty?0:countIndex++===0?5:1405
   else data=options.empty?[]:[{titulo:'Treino A',inicio:'2026-10-22T12:00:00Z',fim:'2026-10-22T13:00:00Z'}]
  }
  if(table==='treinos'){data=options.empty?[]:[{id:'workout',titulo:'Ficha atual',valida_ate:'2026-11-01'}];count=options.empty?0:25}
  if(table==='avaliacoes_fisicas')data=options.empty?[]:[{data:'2026-10-20',peso:70,cintura:null,quadril:null,braco:null}]
  return Promise.resolve({data,count,error:options.errorTable===table?Error('private database error'):null}).then(resolve,reject)
 };return q}}
 return{db,calls}
}
;(async()=>{
 const db=setup(),signal=new AbortController().signal,data=await summary.readMysStudentSummary(db.db,'personal-own',student,signal)
 assert.equal(data.frequencia.sessoesConcluidas30Dias,1405);assert.equal(data.frequencia.sessoesConcluidas7Dias,5)
 assert.equal(data.totalFichasAtivas,25);assert.equal(data.fichasAtivas.length,1);assert.equal(data.avaliacoesRecentes[0].cintura,null)
 assert.match(data.periodo.criterio,/dias corridos/);assert.equal(data.proximaAvaliacaoEm,'2026-11-05')
 assert.equal(db.calls.length,7);assert.equal(db.calls[0].table,'personal_alunos')
 assert.ok(db.calls[0].ops.some(([op,k,v])=>op==='eq'&&k==='personal_id'&&v==='personal-own'))
 assert.ok(db.calls[0].ops.some(([op,k,v])=>op==='eq'&&k==='status'&&v==='ATIVO'))
 assert.ok(db.calls.every(c=>c.ops.some(([op,s])=>op==='abortSignal'&&s===signal)))
 const sessions=db.calls.filter(c=>c.table==='sessoes_treino')
 assert.ok(sessions.every(c=>c.ops.some(([op,k,v])=>op==='eq'&&k==='status'&&v==='CONCLUIDO')))
 assert.ok(sessions.every(c=>c.ops.some(([op,k,v])=>op==='lte'&&k==='inicio'&&v===data.periodo.fim)))
 assert.ok(db.calls.find(c=>c.table==='treinos').ops.some(([op,k,v])=>op==='eq'&&k==='personal_id'&&v==='personal-own'))
 const denied=setup({unlinked:true});await assert.rejects(summary.readMysStudentSummary(denied.db,'personal-own',student,signal),e=>e.status===403);assert.equal(denied.calls.length,1)
 for(const options of [{errorTable:'personal_alunos'},{errorTable:'sessoes_treino'},{errorTable:'treinos'},{nullCount:true}])await assert.rejects(summary.readMysStudentSummary(setup(options).db,'personal-own',student,signal),e=>e.status===503)
 const empty=await summary.readMysStudentSummary(setup({empty:true}).db,'personal-own',student,signal);assert.equal(empty.frequencia.sessoesConcluidas30Dias,0);assert.equal(empty.frequencia.ultimaSessao,null)
 const reader=dataTools.createMysDataReader(setup().db,{id:'personal-own',role:'PERSONAL'},signal,student)
 assert.equal(JSON.parse(await reader.run('resumir_acompanhamento',JSON.stringify({aluno_id:other}))).status,403)
 assert.equal(JSON.parse(await reader.run('consultar_aluno',JSON.stringify({aluno_id:other}))).status,403)
 const context=await reader.run('resumir_acompanhamento',JSON.stringify({aluno_id:student}));assert.equal(JSON.parse(context).dados.aluno.id,student)
 assert.equal(reader.cards[0].metrics[1].value,'1405');assert.equal(reader.sources.size,1)
 const failure=dataTools.createMysDataReader(setup({errorTable:'treinos'}).db,{id:'personal-own',role:'PERSONAL'},signal)
 assert.equal(JSON.parse(await failure.run('resumir_acompanhamento',JSON.stringify({aluno_id:student}))).status,503);assert.equal(failure.sources.size,0)
 const providerRequests=[]
 const generator=load('apps/web/lib/mys/generate.ts',{'./contract':contract,'./data-tools':dataTools},{fetch:async(url,init)=>{providerRequests.push(JSON.parse(init.body));return Response.json({choices:[{message:{content:'Resumo consultado.'},finish_reason:'stop'}]})}})
 const reply=await generator.generateMysReply({key:'fake',model:'test',role:'PERSONAL',messages:[{role:'user',content:'Resuma meu aluno'}],signal,reader,studentContext:{id:student,result:context}})
 assert.equal(reply.sources.length,1);assert.equal(providerRequests[0].messages.at(-1).role,'tool')
 assert.equal(providerRequests[0].messages.at(-2).tool_calls[0].function.name,'resumir_acompanhamento')
 let access={id:'personal-route',role:'PERSONAL'},providerCalls=0,currentDb=setup()
 const route=load('apps/web/app/api/mys/route.ts',{'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},'@/lib/mys/access':{getMysAccess:async()=>access},'@/lib/mys/contract':contract,'@/lib/mys/data-tools':dataTools,'@/lib/supabase/server':{createClient:async()=>currentDb.db},'@/lib/mys/generate':{MysProviderError:generator.MysProviderError,generateMysReply:async options=>{providerCalls++;assert.equal(options.studentContext.id,student);return{message:'ok',sources:[...options.reader.sources]}}}},{process:{env:{DEEPSEEK_API_KEY:'fake'}}})
 const req=(id=student)=>new Request('https://shapeos.test/api/mys',{method:'POST',headers:{origin:'https://shapeos.test','content-type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Resumo'}],studentId:id})})
 assert.equal((await route.POST(req())).status,200);assert.equal(providerCalls,1)
 currentDb=setup({unlinked:true});assert.equal((await route.POST(req())).status,403);assert.equal(providerCalls,1)
 currentDb=setup({errorTable:'treinos'});assert.equal((await route.POST(req())).status,503);assert.equal(providerCalls,1)
 assert.equal((await route.POST(req('invalid'))).status,400)
 access={id:'admin-route',role:'ADMIN'};assert.equal((await route.POST(req())).status,403);assert.equal(providerCalls,1)
 console.log('PASS: exact elapsed-period counts, future bounds, active membership, own workouts, null/missing data, error vs empty, context lock, fresh server prefetch, provider tool protocol and no provider call after denied/failed reads.')
})().catch(error=>{console.error(error);process.exitCode=1})
