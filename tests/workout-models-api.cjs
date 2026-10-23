const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path'),{createRequire}=require('node:module')
function load(file,imports={}){const module={exports:{}};const localRequire=createRequire(path.resolve(file));vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>imports[id]??localRequire(id),Response,Request,URL,TextDecoder,process});return module.exports}
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',student='cccccccc-cccc-4ccc-8ccc-cccccccccccc',source='11111111-1111-4111-8111-111111111111'
let user={id:owner},role='PERSONAL',status='ATIVO',models=[],workouts=[{id:source,personal_id:owner,aluno_id:student,titulo:'Origem',itens_treino:[],aluno:{nome:'Aluno'}}],seq=0,rpcCount=0,denyTarget=false,missingExercise=false
const db={auth:{getUser:async()=>({data:{user},error:null})},from(table){
 const filters=[];let range=null,deleting=false
 const q={select(){return q},eq(key,value){filters.push([key,value]);return q},order(){return q},range(start,end){range=[start,end];return q},delete(){deleting=true;return q},single(){return Promise.resolve({data:table==='usuarios'?{tipo:role,status_conta:status}:null,error:null})},maybeSingle(){return q.then(result=>({...result,data:result.data[0]??null}))},then(resolve,reject){
   let rows=table==='modelos_treino'?models:table==='treinos'?workouts:[]
   rows=rows.filter(row=>filters.every(([key,value])=>row[key]===value))
   if(deleting)models=models.filter(row=>!rows.includes(row))
   if(range)rows=rows.slice(range[0],range[1]+1)
   if(table==='modelos_treino')rows=rows.map(({id,titulo,quantidade_exercicios,criado_em})=>({id,titulo,quantidade_exercicios,criado_em}))
   return Promise.resolve({data:rows,error:null}).then(resolve,reject)
 }};return q
},rpc:async(name,args)=>{
 rpcCount++
 const id=`22222222-2222-4222-8222-${String(++seq).padStart(12,'0')}`
 if(name==='salvar_modelo_de_ficha'){models.push({id,titulo:args.p_titulo,personal_id:user.id,quantidade_exercicios:2,criado_em:'2026-10-22T12:00:00Z',itens:['private snapshot']});return{data:id,error:null}}
 if(denyTarget)return{data:null,error:{code:'42501'}}
 if(missingExercise)return{data:null,error:{code:'23503'}}
 const model=models.find(row=>row.id===args.p_modelo_id)
 workouts.push({id,personal_id:user.id,aluno_id:args.p_aluno_id,titulo:args.p_titulo??model.titulo,ativo:false,valida_ate:null,itens_treino:[],aluno:{nome:'Destino'}})
 return{data:id,error:null}
}}
const shared=load('packages/shared/src/schemas/index.ts')
const fitness=load('apps/web/lib/api/fitness.ts',{'@supabase/supabase-js':{createClient:()=>db},'@/lib/supabase/server':{createClient:async()=>db},'@shapeos/shared':shared})
const helpers=load('apps/web/lib/api/workout-models.ts',{'@/lib/api/fitness':fitness})
const routes=Object.fromEntries(['','/[id]','/[id]/aplicar'].map(part=>[part,load('apps/web/app/api/modelos-treino'+part+'/route.ts',{'@/lib/api/fitness':fitness,'@/lib/api/workout-models':helpers})]))
const base='https://shapeos.test'
const req=(method='GET',payload,path='',headers={})=>new Request(base+'/api/modelos-treino'+path,{method,headers:{Origin:base,...(payload===undefined?{}:{'Content-Type':'application/json'}),...headers},body:payload===undefined?undefined:typeof payload==='string'?payload:JSON.stringify(payload)})
;(async()=>{
 user=null;assert.equal((await routes[''].GET(req())).status,401);user={id:owner}
 for(const type of ['ALUNO','ADMIN']){role=type;assert.equal((await routes[''].GET(req())).status,403)}role='PERSONAL'
 status='BLOQUEADO';assert.equal((await routes[''].GET(req())).status,403);status='ATIVO'
 const payload={ficha_id:source,titulo:'Meu modelo'}
 assert.equal((await routes[''].POST(req('POST',payload,'',{Origin:'https://evil.test'}))).status,403)
 for(const invalid of [{...payload,titulo:'ab'},{...payload,ficha_id:'bad'},{...payload,itens:[]},{}])assert.equal((await routes[''].POST(req('POST',invalid))).status,400)
 assert.equal((await routes[''].POST(req('POST','{'))).status,400)
 assert.equal((await routes[''].POST(req('POST',payload,'',{'Content-Type':'text/plain'}))).status,415)
 const created=await routes[''].POST(req('POST',payload));assert.equal(created.status,201)
 const model=(await created.json()).data,id=model.id,context={params:Promise.resolve({id})}
 assert.equal(model.titulo,'Meu modelo');assert.equal(model.quantidade_exercicios,2);assert.equal(model.itens,undefined);assert.equal(model.personal_id,undefined)
 assert.equal(created.headers.get('location'),'/api/modelos-treino/'+id)
 assert.equal((await routes['/[id]'].GET(req(),context)).status,200)
 user={id:other};const calls=rpcCount
 assert.equal((await routes['/[id]'].GET(req(),context)).status,404)
 assert.equal((await routes['/[id]'].DELETE(req('DELETE'),context)).status,404)
 assert.equal((await routes['/[id]/aplicar'].POST(req('POST',{aluno_id:student}),context)).status,404)
 assert.equal((await routes[''].POST(req('POST',payload))).status,404)
 assert.equal(rpcCount,calls);user={id:owner}
 for(const invalid of [{aluno_id:'bad'},{aluno_id:student,personal_id:owner},{}])assert.equal((await routes['/[id]/aplicar'].POST(req('POST',invalid),context)).status,400)
 denyTarget=true;assert.equal((await routes['/[id]/aplicar'].POST(req('POST',{aluno_id:student}),context)).status,403);denyTarget=false
 missingExercise=true;assert.equal((await routes['/[id]/aplicar'].POST(req('POST',{aluno_id:student}),context)).status,409);missingExercise=false
 const applied=await routes['/[id]/aplicar'].POST(req('POST',{aluno_id:student,titulo:'Treino adaptado'}),context)
 assert.equal(applied.status,201);const copy=(await applied.json()).data
 assert.equal(copy.ativo,false);assert.equal(copy.valida_ate,null);assert.equal(copy.titulo,'Treino adaptado');assert.equal(copy.aluno_id,student)
 for(let i=0;i<24;i++)models.push({id:'page-'+i,titulo:'Modelo '+i,personal_id:owner,quantidade_exercicios:1,criado_em:'2026-10-22T12:00:00Z'})
 models.push({id:'private-other',titulo:'Other',personal_id:other,quantidade_exercicios:1,criado_em:'2026-10-22T12:00:00Z'})
 const page=(await(await routes[''].GET(req())).json()).data
 assert.equal(page.modelos.length,20);assert.equal(page.proximaPagina,1)
 const last=(await(await routes[''].GET(req('GET',undefined,'?pagina=1'))).json()).data
 assert.equal(last.modelos.length,5);assert.equal(last.proximaPagina,null);assert.ok(!last.modelos.some(model=>model.id==='private-other'))
 for(const value of ['-1','1.5','abc','10001'])assert.equal((await routes[''].GET(req('GET',undefined,'?pagina='+value))).status,400)
 assert.equal((await routes['/[id]'].DELETE(req('DELETE'),context)).status,204)
 assert.ok(workouts.some(row=>row.id===copy.id));assert.equal((await routes['/[id]'].GET(req(),context)).status,404)
 console.log('PASS: model APIs, private ownership, pagination, validation, reuse, paused copies, missing exercise and safe deletion.')
})().catch(error=>{console.error(error);process.exitCode=1})
