const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>imports[id]??require(id),Error,Response,Request,URL,TextDecoder,process});return module.exports}
const person='11111111-1111-4111-8111-111111111111',student='22222222-2222-4222-8222-222222222222',send='33333333-3333-4333-8333-333333333333'
let current=person,role='PERSONAL',status='ATIVO',rpcError=null,readError=false,countMissing=false;const calls=[],rpcs=[]
const members=Array.from({length:1205},(_,i)=>({aluno:{id:String(i),nome:'Aluno '+i,email:'aluno@test'}}))
const db={auth:{getUser:async()=>({data:{user:current?{id:current}:null},error:null})},from(table){const call={table,ops:[]};calls.push(call);const q={}
 for(const method of ['select','eq','order','range','single'])q[method]=(...args)=>{call.ops.push([method,...args]);return q}
 q.then=(resolve,reject)=>{if(table==='usuarios')return Promise.resolve({data:{tipo:role,status_conta:status},error:null}).then(resolve,reject)
 const range=call.ops.find(([op])=>op==='range')
 return Promise.resolve({data:table==='personal_alunos'?members.slice(range[1],range[1]+137):[{envio_id:send,titulo:'Título',alunos:[],destinatarios:1,leituras:0}],count:countMissing?null:14,error:readError?{code:'XX000'}:null}).then(resolve,reject)};return q
 },rpc:async(name,args)=>{rpcs.push({name,args});return{data:args.p_alunos.length,error:rpcError}}}
const schema=load('packages/shared/src/schemas/index.ts'),api=load('apps/web/lib/api/fitness.ts',{'@shapeos/shared':schema,'@/lib/supabase/server':{createClient:async()=>db},'@supabase/supabase-js':{createClient:()=>db}})
const notice=load('apps/web/lib/fitness/personal-notice.ts',{'@/lib/api/fitness':api})
const route=load('apps/web/app/api/comunicados/route.ts',{'@/lib/api/fitness':api,'@/lib/fitness/personal-notice':notice})
const draft={id:send,titulo:'  Orientação  ',mensagem:'  Texto para alunos  ',alunos:[student]}
assert.equal(notice.parseNoticeDraft(draft).titulo,'Orientação')
for(const data of [{...draft,personal_id:person},{...draft,id:'bad'},{...draft,titulo:'a'},{...draft,titulo:'x'.repeat(121)},{...draft,mensagem:' '},{...draft,mensagem:'x'.repeat(4001)},{...draft,alunos:[]},{...draft,alunos:[student,student]},{...draft,alunos:[true]},{...draft,alunos:Array(101).fill(student)}])assert.throws(()=>notice.parseNoticeDraft(data))
const request=(method='GET',data,path='comunicados',origin='https://shapeos.test',contentType='application/json')=>new Request('https://shapeos.test/api/'+path,{method,headers:{origin,'content-type':contentType},body:data===undefined?undefined:JSON.stringify(data)})
;(async()=>{
 current=null;assert.equal((await route.GET(request())).status,401);current=person
 for(const denied of ['ALUNO','ADMIN']){role=denied;assert.equal((await route.GET(request())).status,403);assert.equal((await route.POST(request('POST',draft))).status,403)}role='PERSONAL'
 status='BLOQUEADO';assert.equal((await route.POST(request('POST',draft))).status,403);status='ATIVO'
 assert.equal((await route.POST(request('POST',draft,'comunicados','https://evil.test'))).status,403)
 assert.equal((await route.POST(request('POST',draft,'comunicados','https://shapeos.test','text/plain'))).status,415)
 const response=await route.POST(request('POST',draft));assert.equal(response.status,201);assert.equal((await response.json()).data.total,1)
 assert.equal(rpcs[0].name,'publicar_comunicado_personal');assert.equal(rpcs[0].args.p_envio_id,send);assert.equal(rpcs[0].args.p_titulo,'Orientação');assert.equal(rpcs[0].args.p_personal_id,undefined)
 rpcError={code:'42501'};assert.equal((await route.POST(request('POST',draft))).status,403);rpcError={code:'22023'};assert.equal((await route.POST(request('POST',draft))).status,400);rpcError=null
 const list=await route.GET(request('GET',undefined,'comunicados?pagina=2'));assert.equal(list.status,200);assert.equal((await list.json()).data.total,14)
 const listCall=calls.find(c=>c.table==='personal_comunicados_enviados');assert.ok(listCall.ops.some(([op,k,v])=>op==='eq'&&k==='personal_id'&&v===person));assert.ok(listCall.ops.some(([op,a,b])=>op==='range'&&a===10&&b===19))
 for(const page of ['0','-1','1.5','x','10001'])assert.equal((await route.GET(request('GET',undefined,'comunicados?pagina='+page))).status,400)
 const recipients=await route.GET(request('GET',undefined,'comunicados?destinatarios=1'));assert.equal((await recipients.json()).data.length,1205)
 const queries=calls.filter(c=>c.table==='personal_alunos');assert.ok(queries.every(c=>c.ops.some(([op,k,v])=>op==='eq'&&k==='personal_id'&&v===person)));assert.ok(queries.every(c=>c.ops.some(([op,k,v])=>op==='eq'&&k==='aluno.status_conta'&&v==='ATIVO')))
 readError=true;assert.equal((await route.GET(request())).status,500);readError=false;countMissing=true;assert.equal((await route.GET(request())).status,500)
 console.log('PASS: notice schema/limits, active roles, Origin and JSON, server identity, RPC errors, private history pagination, eligible recipients beyond 1000 and read failures.')
})().catch(error=>{console.error(error);process.exitCode=1})
