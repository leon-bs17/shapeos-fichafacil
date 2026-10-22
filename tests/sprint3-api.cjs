const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm')
const ts=require('typescript')
function load(path,imports){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>imports[n]??require(n),Response,Request,URL,TextDecoder,process,console});return module.exports}
const destination='44444444-4444-4444-8444-444444444444'
const personal='40e247a5-ec08-4c0a-b8f9-62b44c0fcdac',aluno='05067dea-ec38-4f40-a592-e2bff1275d06',exercise='22222222-2222-4222-8222-222222222222'
let current={id:personal},role='PERSONAL',status='ATIVO',rows=[],seq=0,denyCopy=false
const db={auth:{getUser:async token=>({data:{user:token==='invalid'?null:current},error:null})},from(table){
 let filters=[],patch=null,remove=false
 const q={select(){return q},order(){return q},ilike(){return q},eq(k,v){filters.push([k,v]);return q},update(v){patch=v;return q},delete(){remove=true;return q},single(){return Promise.resolve({data:table==='usuarios'?{tipo:role,status_conta:status}:null,error:null})},maybeSingle(){return q.then(r=>({...r,data:r.data[0]??null}))},then(ok,no){
  let data=table==='treinos'?rows:table==='exercicios'?[{id:exercise,nome:'Supino Reto',grupo_muscular:'Peito',criado_por:personal}]:[]
  data=data.filter(row=>filters.every(([k,v])=>row[k]===v))
  if(patch)data.forEach(row=>Object.assign(row,patch));if(remove)rows=rows.filter(row=>!data.includes(row))
  return Promise.resolve({data,error:null}).then(ok,no)
 }};return q
},rpc:async(name,args)=>{
 if(name==='duplicar_ficha_para_aluno'&&denyCopy)return{data:null,error:{code:'42501'}}
 if(name==='editar_ficha_com_validade'){const row=rows.find(r=>r.id===args.p_ficha_id);row.titulo=args.p_titulo;row.itens_treino=args.p_itens;if(args.p_alterar_validade)row.valida_ate=args.p_valida_ate;return{data:null,error:null}}
 const original=rows.find(r=>r.id===args.p_ficha_id),id=`11111111-1111-4111-8111-${String(++seq).padStart(12,'0')}`
 rows.push({id,valida_ate:args.p_valida_ate??null,titulo:original?(args.p_titulo??original.titulo+' (cópia)'):args.p_titulo,ativo:!original,aluno_id:args.p_aluno_id??aluno,personal_id:personal,aluno:{nome:args.p_aluno_id===destination?'Aluno destino':'Aluno de teste'},itens_treino:args.p_itens??original.itens_treino})
 return {data:id,error:null}
}}
const schemas=load('packages/shared/src/schemas/index.ts',{})
const workoutTools=load('apps/web/lib/fitness/workout-tools.ts',{})
const candidates=[{id:'a',titulo:'Força A',aluno_nome:'João',ativo:true,itens:[]},{id:'b',titulo:'Treino B',aluno_nome:'Maria',ativo:false,itens:[]}]
assert.equal(workoutTools.filterWorkouts(candidates,'joao','ATIVAS')[0].id,'a')
assert.equal(workoutTools.filterWorkouts(candidates,'forca','TODAS').length,1)
assert.equal(workoutTools.filterWorkouts(candidates,'joao','PAUSADAS').length,0)
const exported=JSON.parse(workoutTools.exportWorkouts(workoutTools.filterWorkouts(candidates,'Maria','TODAS')))
assert.equal(exported.total,1);assert.equal(exported.fichas[0].id,'b');assert.equal(exported.versao,1)
const helpers=load('apps/web/lib/api/fitness.ts',{'@/lib/supabase/server':{createClient:async()=>db},'@supabase/supabase-js':{createClient:()=>db},'@shapeos/shared':schemas})
const routes=Object.fromEntries(['treinos','treinos/[id]','treinos/[id]/duplicar','exercicios'].map(path=>[path,load('apps/web/app/api/'+path+'/route.ts',{'@/lib/api/fitness':helpers})]))
const base='https://shapeos.test'
function req(path,method='GET',payload,headers={}){return new Request(base+path,{method,headers:{Origin:base,...(payload!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:payload===undefined?undefined:typeof payload==='string'?payload:JSON.stringify(payload)})}
const input={valida_ate:'2026-11-15',aluno_id:aluno,titulo:'Treino teste',itens:[{exercicio_id:exercise,series:3,repeticoes:'10',descanso_segundos:60,ordem:0}]}
;(async()=>{
 current=null;assert.equal((await routes.treinos.GET(req('/api/treinos'))).status,401);current={id:personal}
 role='ALUNO';assert.equal((await routes.treinos.POST(req('/api/treinos','POST',input))).status,403);role='PERSONAL'
 status='BLOQUEADO';assert.equal((await routes.treinos.GET(req('/api/treinos'))).status,403);status='ATIVO'
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST',input,{Origin:'https://evil.test'}))).status,403)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST','{'))).status,400)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST',input,{'Content-Type':'text/plain'}))).status,415)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST',{...input,personal_id:'forged'}))).status,400)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST','x'.repeat(65537)))).status,413)
 assert.equal((await routes.treinos.GET(req('/api/treinos','GET',undefined,{Authorization:'Bearer invalid'}))).status,401)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST',{...input,valida_ate:'2026-02-30'}))).status,400)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST',{...input,valida_ate:'22/10/2026'}))).status,400)
 assert.equal((await routes.treinos.POST(req('/api/treinos','POST',{...input,valida_ate:'0000-01-01'}))).status,400)
 const created=await routes.treinos.POST(req('/api/treinos','POST',input));assert.equal(created.status,201);const id=(await created.json()).data.id,context={params:Promise.resolve({id})}
 assert.equal(created.headers.get('location'),'/api/treinos/'+id);assert.equal(created.headers.get('cache-control'),'no-store')
 const list=await routes.treinos.GET(req('/api/treinos'));assert.equal((await list.json()).data.length,1)
 current={id:aluno};role='ALUNO';assert.equal((await routes['treinos/[id]'].GET(req('/api/treinos/'+id),context)).status,200)
 assert.equal((await routes['treinos/[id]'].DELETE(req('/api/treinos/'+id,'DELETE'),context)).status,403)
 current={id:'33333333-3333-4333-8333-333333333333'};role='PERSONAL';assert.equal((await routes['treinos/[id]'].GET(req('/api/treinos/'+id),context)).status,404)
 current={id:personal};assert.equal((await routes['treinos/[id]'].PATCH(req('/api/treinos/'+id,'PATCH',{ativo:false}),context)).status,200)
 assert.equal((await routes['treinos/[id]'].PATCH(req('/api/treinos/'+id,'PATCH',{titulo:'Editado',itens:input.itens}),context)).status,200)
 assert.equal(rows.find(row=>row.id===id).valida_ate,'2026-11-15')
 assert.equal((await routes['treinos/[id]'].PATCH(req('/api/treinos/'+id,'PATCH',{titulo:'Editado',itens:input.itens,valida_ate:null}),context)).status,200)
 assert.equal(rows.find(row=>row.id===id).valida_ate,null)
 assert.equal((await routes['treinos/[id]'].PATCH(req('/api/treinos/'+id,'PATCH',{titulo:'Editado',itens:input.itens,valida_ate:'2026-12-01'}),context)).status,200)
 assert.equal(rows.find(row=>row.id===id).valida_ate,'2026-12-01')
 const copy=await routes['treinos/[id]/duplicar'].POST(req('/api/treinos/'+id+'/duplicar','POST'),context);assert.equal(copy.status,201);assert.equal((await copy.json()).data.ativo,false)
 const duplicate=routes['treinos/[id]/duplicar']
 const copied=await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST',{aluno_id:destination,titulo:'Ficha adaptada'}),context)
 assert.equal(copied.status,201)
 const target=(await copied.json()).data
 assert.equal(target.aluno_id,destination);assert.equal(target.titulo,'Ficha adaptada');assert.equal(target.ativo,false);assert.equal(target.valida_ate,null)
 assert.equal(rows.find(row=>row.id===id).aluno_id,aluno);assert.equal(rows.find(row=>row.id===id).titulo,'Editado')
 const beforeDenied=rows.length
 denyCopy=true;assert.equal((await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST',{aluno_id:destination}),context)).status,403);denyCopy=false
 assert.equal(rows.length,beforeDenied)
 for(const payload of [{aluno_id:'invalid'},{aluno_id:destination,personal_id:personal},{aluno_id:destination,titulo:'ab'},{aluno_id:destination,titulo:'x'.repeat(81)},{}])assert.equal((await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST',payload),context)).status,400)
 assert.equal((await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST','{'),context)).status,400)
 assert.equal((await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST',{aluno_id:destination},{'Content-Type':'text/plain'}),context)).status,415)
 assert.equal((await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST',{aluno_id:destination},{Origin:'https://evil.test'}),context)).status,403)
 role='ALUNO';assert.equal((await duplicate.POST(req('/api/treinos/'+id+'/duplicar','POST',{aluno_id:destination}),context)).status,403);role='PERSONAL'
 const catalog=await routes.exercicios.GET(req('/api/exercicios'));const entry=(await catalog.json()).data[0];assert.equal(entry.proprio,true);assert.equal(entry.criado_por,undefined)
 assert.equal((await routes['treinos/[id]'].GET(req('/api/treinos/bad'),{params:Promise.resolve({id:'bad'})})).status,400)
 assert.equal((await routes['treinos/[id]'].DELETE(req('/api/treinos/'+id,'DELETE'),context)).status,204)
 assert.equal((await routes['treinos/[id]'].GET(req('/api/treinos/'+id),context)).status,404)
 console.log('PASS: REST operations, copy to another student, legacy duplication, destination/title validation, ownership, roles, Origin, Bearer, JSON and HTTP statuses.')
})().catch(error=>{console.error(error);process.exit(1)})


