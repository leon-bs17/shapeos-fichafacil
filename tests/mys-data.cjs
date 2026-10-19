const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, imports, extra = {}) {
  const module = { exports:{} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText, { module,exports:module.exports,require:name=>imports[name],console,Date,JSON,Object,Set,AbortSignal,...extra })
  return module.exports
}
const dataModule = load('apps/web/lib/mys/data-tools.ts',{})
const contract = load('apps/web/lib/mys/contract.ts',{})
const queries=[]
let linked=false, dbError=false
const id='05067dea-ec38-4f40-a592-e2bff1275d06'
const workoutId='11111111-1111-4111-8111-111111111111'
const db={from(table){
  const ops=[]; queries.push({table,ops})
  const q={}
  for(const name of ['select','eq','ilike','order','limit','gte','abortSignal','maybeSingle'])q[name]=(...args)=>{ops.push([name,...args]);return q}
  q.then=(resolve,reject)=>{
    let data=[]
    if(table==='personal_alunos')data=ops.some(o=>o[0]==='maybeSingle') ? (linked ? {aluno_id:id}:null) : [{aluno:{id,nome:'Aluno Teste',status_conta:'ATIVO'}}]
    if(table==='usuarios')data={id,nome:'Aluno Teste'}
    if(table==='treinos')data=ops.some(o=>o[0]==='maybeSingle') ? {id:workoutId,aluno_id:id,titulo:'Treino Teste'} : [{id:workoutId,titulo:'Treino Teste'}]
    return Promise.resolve({data,error:dbError ? {message:'private-db-error'}:null,count:2}).then(resolve,reject)
  }
  return q
}}
const signal=AbortSignal.timeout(5000)
const personal=dataModule.createMysDataReader(db,{id:'personal-server-id',role:'PERSONAL'},signal)
;(async()=>{
  for(const tool of ['executar_sql','__proto__','delete'])assert.match(await personal.run(tool,'{}'),/Consulta não permitida/)
  assert.equal(queries.length,0)
  assert.match(await personal.run('buscar_alunos','{"nome":"Teste","personal_id":"forged"}'),/Argumentos não permitidos/)
  assert.equal(queries.length,0)
  assert.match(await personal.run('consultar_aluno',JSON.stringify({aluno_id:id})),/fora do seu acesso/)
  assert.equal(personal.cards.length,0)
  assert.equal(queries.length,1)
  assert.equal(queries[0].table,'personal_alunos')
  assert.ok(queries[0].ops.some(o=>o[0]==='eq'&&o[1]==='personal_id'&&o[2]==='personal-server-id'))
  linked=true;queries.length=0
  assert.ok(JSON.parse(await personal.run('buscar_alunos','{"nome":"Teste"}')).dados.alunos.length)
  assert.ok(queries[0].ops.some(o=>o[0]==='eq'&&o[1]==='status'&&o[2]==='ATIVO'))
  assert.ok(queries[0].ops.some(o=>o[0]==='eq'&&o[1]==='personal_id'&&o[2]==='personal-server-id'))
  queries.length=0
  assert.equal(personal.cards[0].title,'Aluno Teste')
  assert.match(personal.cards[0].prompt,new RegExp(id))
  assert.ok(JSON.parse(await personal.run('consultar_treino',JSON.stringify({treino_id:workoutId}))).dados.ficha)
  assert.ok(queries[0].ops.some(o=>o[0]==='eq'&&o[1]==='personal_id'&&o[2]==='personal-server-id'))
  assert.equal(queries[1].table,'personal_alunos')
  dbError=true
  const cardsBeforeError=personal.cards.length
  assert.match(await personal.run('resumo_shapeos','{}'),/indisponível/)
  assert.equal(personal.cards.length,cardsBeforeError)
  assert.doesNotMatch(await personal.run('consultar_aluno',JSON.stringify({aluno_id:id})),/private-db-error/)
  dbError=false;queries.length=0
  const admin=dataModule.createMysDataReader(db,{id:'admin-server-id',role:'ADMIN'},signal)
  assert.equal(JSON.parse(await admin.run('resumo_shapeos','{}')).dados.usuarios.alunos,2)
  assert.ok(queries.every(q=>q.ops.some(o=>o[0]==='select'&&o[2]?.head===true)))
  const requests=[];let providerStep=0
  const generator=load('apps/web/lib/mys/generate.ts',{'./contract':contract,'./data-tools':dataModule},{fetch:async(url,init)=>{
    requests.push(JSON.parse(init.body));providerStep++
    return Response.json({choices:[{message:providerStep===1 ? {tool_calls:[{id:'call-1',type:'function',function:{name:'resumo_shapeos',arguments:'{}'}}]} : {content:'Você tem 2 alunos vinculados.'},finish_reason:'stop'}]})
  },Response})
  const reply=await generator.generateMysReply({key:'fake',model:'deepseek-flash',role:'PERSONAL',messages:[{role:'user',content:'Quantos alunos tenho?'}],signal,reader:personal})
  assert.equal(reply.message,'Você tem 2 alunos vinculados.')
  assert.ok(reply.sources.includes('Resumo da ShapeOS'))
  assert.equal(reply.cards.find(card=>card.kind==='summary').metrics[0].value,'2')
  assert.equal(requests[1].messages.at(-1).role,'tool')
  assert.match(requests[1].messages.at(-1).content,/alunosVinculadosAtivos/)
  console.log('Mys: consultas, vínculo ativo, IDs e argumentos, erros, contagens e ciclo de ferramentas validados.')
})().catch(error=>{console.error(error);process.exit(1)})
