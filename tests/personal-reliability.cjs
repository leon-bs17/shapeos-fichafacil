const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
function load(file,imports={}) {const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,require:n=>imports[n],console});return module.exports}
const {groupLoadHistory,summarizeLoadHistory}=load('apps/web/lib/fitness/load-history.ts')
const record=(id,exercise,load)=>({id,item_treino_id:'item'+id,exercicio_id:exercise,exercicio_nome:'Mesmo nome',carga_utilizada:load,repeticoes_feitas:10,data_registro:`2026-10-${id.padStart(2,'0')}T12:00:00Z`})
const groups=groupLoadHistory([record('3','A',null),record('1','A',40),record('2','B',0)])
assert.equal(groups.length,2);assert.equal(summarizeLoadHistory(groups[0]).best,40);assert.equal(summarizeLoadHistory(groups[0]).difference,null);assert.equal(summarizeLoadHistory(groups[0]).missing,1)
assert.equal(summarizeLoadHistory(groups[1]).best,0)
assert.equal(summarizeLoadHistory(groupLoadHistory([record('1','A',null)])[0]).best,null)
assert.equal(summarizeLoadHistory(groupLoadHistory([record('1','A',40),record('2','A',45),record('3','A',null)])[0]).difference,5)
const filters=load('apps/web/lib/fitness/list-filters.ts');assert.equal(filters.studentStatusFilter('bad'),'TODOS');assert.equal(filters.workoutStatusFilter('ATIVAS'),'ATIVAS');assert.equal(filters.filterLinkedStudents([{status:'ATIVO'},{status:'INATIVO'}],'ATIVO').length,1);assert.equal(filters.paginationPages(500,1000).length,7)
const calls=[];let fail=false
const records=Array.from({length:1205},(_,i)=>({id:String(i),item_treino_id:'item',item:{exercicio:{id:'exercise',nome:'Teste'}},carga_utilizada:i?null:0,repeticoes_feitas:10,data_registro:'2026-10-24T12:00:00Z'}))
const students=Array.from({length:1005},(_,i)=>({id:'link'+i,status:'ATIVO',criado_em:'2026-01-01',aluno:{id:'student'+i,nome:'Aluno',email:'a@example.test'}}))
const workouts=Array.from({length:1205},()=>({aluno_id:'student0'}))
const db={from(table){const c={table,ops:[]};calls.push(c);const q={};for(const op of ['select','eq','order','gte','lte','abortSignal'])q[op]=(...args)=>{c.ops.push([op,...args]);return q};q.range=(a,b)=>{c.range=[a,b];return q};q.then=(resolve,reject)=>Promise.resolve({data:fail?null:(table==='registro_execucao'?records:table==='personal_alunos'?students:workouts).slice(c.range[0],c.range[1]+1),error:fail?{message:'failed'}:null}).then(resolve,reject);return q}}
;(async()=>{
 const service=load('apps/web/services/registros.ts');const result=await service.registrosDoAluno(db,'student0',{start:'2026-10-01',end:'2026-10-25'})
 assert.equal(result.length,1205);assert.equal(result[0].carga_utilizada,0);assert.equal(result[1].carga_utilizada,null)
 for(const c of calls){assert(c.ops.some(o=>o[0]==='eq'&&o[1]==='aluno_id'&&o[2]==='student0'));assert(c.ops.some(o=>o[0]==='gte'));assert(c.ops.some(o=>o[0]==='lte'))}
 calls.length=0;const alunos=await load('apps/web/services/alunos.ts').buscarAlunosDoPersonal(db,'personal0');assert.equal(alunos.length,1005);assert.equal(alunos[0].treinos_ativos,1205)
 for(const c of calls)assert(c.ops.some(o=>o[0]==='eq'&&o[1]==='personal_id'&&o[2]==='personal0'))
 fail=true;await assert.rejects(()=>service.registrosDoAluno(db,'student0'));await assert.rejects(()=>load('apps/web/services/alunos.ts').buscarAlunosDoPersonal(db,'personal0'))
 console.log('PASS: missing vs zero loads, stable exercise identity, period before pagination, 1205 records/workouts, 1005 students, ownership, errors and bounded pagination.')
})().catch(e=>{console.error(e);process.exit(1)})
