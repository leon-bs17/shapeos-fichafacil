const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
function load(file,imports={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:id=>imports[id]??require(id),Date,Error,Response,Request,URL,TextDecoder,process});return module.exports}
const tools=load('apps/web/lib/fitness/exercise-library.ts')
const sample=[{id:'a',nome:'Elevação A',grupo_muscular:'Ombros',equipamento:'Halteres'},{id:'b',nome:'Elevação B',grupo_muscular:'Ombros',equipamento:'Máquina'},{id:'c',nome:'Elevação C',grupo_muscular:'Ombros',equipamento:'Halteres'},{id:'d',nome:'Supino',grupo_muscular:'Peito',equipamento:null},{id:'e',nome:'Elevação D',grupo_muscular:'Ombros',equipamento:null}]
assert.equal(tools.filterExerciseLibrary(sample,'elevacao','Todos','Todos',false,new Set()).length,4)
assert.equal(tools.filterExerciseLibrary(sample,'elevacao','Ombros','Halteres',true,new Set(['a']))[0].id,'a')
assert.equal(tools.filterExerciseLibrary(sample,'','Todos','Sem equipamento informado',false,new Set()).length,2)
assert.equal(tools.exerciseAlternatives(sample[0],sample)[0].id,'c')
assert.equal(tools.exerciseAlternatives(sample[0],sample,'Máquina')[0].id,'b')
assert.equal(tools.exerciseAlternatives(sample[0],sample,'Sem equipamento informado')[0].id,'e')
assert.ok(tools.exerciseAlternatives(sample[0],sample).every(e=>e.id!=='a'&&e.grupo_muscular==='Ombros'))
assert.equal(tools.exerciseAlternatives({...sample[0],grupo_muscular:''},sample).length,0)
assert.equal(sample[0].id,'a')
const personal='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222'
const id=n=>`33333333-3333-4333-8333-${String(n).padStart(12,'0')}`
let current=personal,role='PERSONAL',status='ATIVO',dbFail=null
let favorites=Array.from({length:1205},(_,i)=>({personal_id:personal,exercicio_id:id(i)})).concat([{personal_id:other,exercicio_id:id(0)}])
const catalog=Array.from({length:1205},(_,i)=>({id:id(i),nome:'Exercício '+i,grupo_muscular:'Peito',equipamento:'Halteres',video_url:null,criado_por:personal}))
const calls=[]
const db={auth:{getUser:async()=>({data:{user:current?{id:current}:null},error:null})},from(table){
 const call={table,filters:[]};calls.push(call);let range,remove=false,insert=null,single=false
 const q={select(fields){call.fields=fields;return q},order(){return q},eq(k,v){call.filters.push([k,v]);return q},ilike(k,v){call.search=[k,v];return q},range(a,b){range=[a,b];call.range=range;return q},delete(){remove=true;return q},upsert(value,config){insert=value;call.upsert={value,config};return q},single(){single=true;return q},maybeSingle(){single=true;return q},then(resolve,reject){
  if(table==='usuarios')return Promise.resolve({data:{tipo:role,status_conta:status},error:null}).then(resolve,reject)
  let data=(table==='exercicios'?catalog:favorites).filter(row=>call.filters.every(([k,v])=>row[k]===v))
  if(remove)favorites=favorites.filter(row=>!data.includes(row))
  if(insert&&!favorites.some(row=>row.personal_id===insert.personal_id&&row.exercicio_id===insert.exercicio_id))favorites.push(insert)
  if(range)data=data.slice(range[0],Math.min(range[1]+1,range[0]+137))
  return Promise.resolve({data:single?data[0]??null:data,error:dbFail===table?{code:'XX000'}:null}).then(resolve,reject)
 }};return q
}}
const schemas=load('packages/shared/src/schemas/index.ts')
const api=load('apps/web/lib/api/fitness.ts',{'@/lib/supabase/server':{createClient:async()=>db},'@supabase/supabase-js':{createClient:()=>db},'@shapeos/shared':schemas})
const routes=Object.fromEntries(['exercicios','exercicios/favoritos','exercicios/[id]/favorito'].map(p=>[p,load('apps/web/app/api/'+p+'/route.ts',{'@/lib/api/fitness':api})]))
const request=(p,method='GET',origin='https://shapeos.test')=>new Request('https://shapeos.test/api/'+p,{method,headers:{Origin:origin}})
const context=value=>({params:Promise.resolve({id:value})})
;(async()=>{
 const list=routes['exercicios/favoritos'],entry=routes['exercicios/[id]/favorito']
 current=null;assert.equal((await list.GET(request('exercicios/favoritos'))).status,401);current=personal
 for(const denied of ['ALUNO','ADMIN']){role=denied;assert.equal((await list.GET(request('exercicios/favoritos'))).status,403);assert.equal((await entry.PUT(request('x','PUT'),context(id(0)))).status,403)}role='PERSONAL'
 status='BLOQUEADO';assert.equal((await list.GET(request('x'))).status,403);status='ATIVO'
 assert.equal((await entry.PUT(request('x','PUT','https://evil.test'),context(id(0)))).status,403)
 assert.equal((await entry.PUT(request('x','PUT'),context('invalid'))).status,400)
 assert.equal((await entry.PUT(request('x','PUT'),context(id(9999)))).status,404)
 const all=await list.GET(request('exercicios/favoritos'));assert.equal(all.status,200);assert.equal((await all.json()).data.length,1205)
 assert.equal(all.headers.get('cache-control'),'no-store')
 assert.ok(calls.filter(c=>c.table==='exercicios_favoritos'&&c.range).every(c=>c.filters.some(([k,v])=>k==='personal_id'&&v===personal)))
 await entry.PUT(request('x','PUT'),context(id(0)));await entry.PUT(request('x','PUT'),context(id(0)))
 assert.equal(favorites.filter(row=>row.personal_id===personal&&row.exercicio_id===id(0)).length,1)
 assert.ok(calls.find(c=>c.upsert).upsert.config.ignoreDuplicates)
 await entry.DELETE(request('x','DELETE'),context(id(0)));await entry.DELETE(request('x','DELETE'),context(id(0)))
 assert.equal(favorites.filter(row=>row.personal_id===personal&&row.exercicio_id===id(0)).length,0)
 assert.equal(favorites.filter(row=>row.personal_id===other&&row.exercicio_id===id(0)).length,1)
 current=other;const isolated=await list.GET(request('x'));assert.equal((await isolated.json()).data.length,1);current=personal
 const exercises=await routes.exercicios.GET(request('exercicios?q=100%25&grupo=Peito'))
 const result=(await exercises.json()).data;assert.equal(result.length,1205);assert.equal(result[0].proprio,true);assert.equal(result[0].criado_por,undefined)
 assert.ok(calls.some(c=>c.search?.[1]==='%100\\%%'))
 dbFail='exercicios_favoritos';assert.equal((await list.GET(request('x'))).status,500)
 console.log('PASS: combined accent-aware filters, ranked same-group alternatives, API auth/roles/Origin, private favorites, idempotent writes, malformed/missing IDs, pagination beyond 1000 and failures.')
})().catch(e=>{console.error(e);process.exitCode=1})
