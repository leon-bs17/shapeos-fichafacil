const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>imports[id]??require(id),Date,Error,AbortController});return exports}
const helpers=load('apps/web/lib/fitness/follow-up.ts')
const deadlines=load('apps/web/lib/fitness/deadlines.ts')
for(const now of [new Date(2026,9,22,0,5),new Date(2026,0,1,23,59),new Date(2024,2,1,0,1),new Date(2026,2,9,0,5),new Date(2026,10,2,23,59)]){
 const window=helpers.followUpWindows(now),week=new Date(window.weekStart),month=new Date(window.monthStart)
 const expectedWeek=new Date(now),expectedMonth=new Date(now)
 expectedWeek.setDate(now.getDate()-6);expectedMonth.setDate(now.getDate()-29)
 assert.equal(week.getHours(),0);assert.equal(month.getHours(),0)
 assert.equal(week.toDateString(),expectedWeek.toDateString());assert.equal(month.toDateString(),expectedMonth.toDateString())
 assert.equal(window.end,now.toISOString());assert.ok(month<=week&&week<=now)
}
function setup(options={}){
 const calls=[];let countIndex=0
 const db={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'personal-own'}},error:null})},from(table){
  const call={table,filters:[]};calls.push(call)
  const q={select(fields,config){call.fields=fields;call.config=config;return q},eq(key,value){call.filters.push(['eq',key,value]);return q},gte(key,value){call.filters.push(['gte',key,value]);return q},lte(key,value){call.filters.push(['lte',key,value]);return q},order(column,config){call.order={column,...config};return q},limit(count){call.limit=count;return q},abortSignal(signal){call.signal=signal;return q},maybeSingle(){call.single=true;return q},then(resolve,reject){
   let response
   if(table==='personal_alunos')response={data:options.unlinked?null:{status:options.inactive?'INATIVO':'ATIVO',proxima_avaliacao_em:'2026-11-01'},error:options.linkError?Error('database'):null}
   else if(table==='avaliacoes_fisicas')response={data:options.empty?[]:[{data:'2026-10-20'}],error:null}
   else if(call.config?.head)response={data:null,count:options.nullCount?null:options.empty?0:countIndex++===0?7:1305,error:null}
   else response={data:options.empty?[]:[{id:'last',titulo:'Treino A',inicio:'2026-10-21T12:00:00Z',fim:'2026-10-21T13:00:00Z'}],error:options.sessionError?Error('database'):null}
   return Promise.resolve(response).then(resolve,reject)
  }};return q
 }}
 return {...load('apps/web/services/student-follow-up.ts',{'@/lib/supabase/client':{createClient:()=>db},'@/lib/fitness/follow-up':helpers,'@/lib/fitness/deadlines':deadlines}),calls}
}
;(async()=>{
 const api=setup(),controller=new AbortController(),data=await api.fetchStudentFollowUp('student-own',controller.signal)
 assert.equal(data.lastSession.id,'last');assert.equal(data.completed7Days,7);assert.equal(data.completed30Days,1305)
 assert.equal(data.latestAssessment,'2026-10-20');assert.equal(data.nextAssessment,'2026-11-01')
 assert.equal(api.calls.length,5)
 assert.ok(api.calls[0].filters.some(([op,key,value])=>op==='eq'&&key==='personal_id'&&value==='personal-own'))
 assert.ok(api.calls.every(call=>call.filters.some(([op,key,value])=>op==='eq'&&key==='aluno_id'&&value==='student-own')))
 assert.ok(api.calls.every(call=>call.signal===controller.signal))
 const sessions=api.calls.filter(call=>call.table==='sessoes_treino')
 assert.ok(sessions.every(call=>call.filters.some(([op,key,value])=>op==='eq'&&key==='status'&&value==='CONCLUIDO')))
 assert.ok(sessions.every(call=>call.filters.some(([op,key])=>op==='lte'&&key==='inicio')))
 assert.equal(sessions.filter(call=>call.config?.count==='exact'&&call.config.head===true).length,2)
 assert.equal(sessions.find(call=>!call.config?.head).limit,1)
 assert.ok(api.calls.every(call=>!call.fields.includes('*')))
 const empty=await setup({empty:true}).fetchStudentFollowUp('student-own')
 assert.equal(empty.lastSession,null);assert.equal(empty.latestAssessment,null);assert.equal(empty.completed7Days,0);assert.equal(empty.completed30Days,0)
 for(const options of [{unlinked:true},{inactive:true},{linkError:true}]){const invalid=setup(options);await assert.rejects(invalid.fetchStudentFollowUp('student-other'));assert.equal(invalid.calls.length,1)}
 const noUser=setup({noUser:true});await assert.rejects(noUser.fetchStudentFollowUp('student-own'),/Sessão expirada/);assert.equal(noUser.calls.length,0)
 await assert.rejects(setup().fetchStudentFollowUp(''),/Aluno indisponível/)
 await assert.rejects(setup({sessionError:true}).fetchStudentFollowUp('student-own'),/Não foi possível carregar/)
 await assert.rejects(setup({nullCount:true}).fetchStudentFollowUp('student-own'),/Não foi possível carregar/)
 console.log('PASS: student follow-up windows, calendar boundaries, exact counts, ownership, cancellation, missing data and errors.')
})().catch(error=>{console.error(error);process.exitCode=1})
