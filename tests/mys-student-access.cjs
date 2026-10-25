const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleCode=ts.transpileModule(fs.readFileSync('apps/web/lib/mys/data-tools.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInNewContext(moduleCode,{module:mod,exports:mod.exports,require:()=>({}),console,AbortSignal,Date,Set,Map});
const own='11111111-1111-4111-8111-111111111111',workout='22222222-2222-4222-8222-222222222222';let calls=[],fail=false;
const db={from(table){const q={table,filters:[],select(fields,options){this.fields=fields;this.options=options;return this},eq(k,v){this.filters.push([k,v]);return this},gte(){return this},lte(){return this},order(){return this},limit(){return this},abortSignal(){return this},maybeSingle(){this.single=true;return this},then(resolve,reject){calls.push(this);let data=this.options?.head?null:[];if(table==='treinos')data=this.single?(this.filters.some(([k,v])=>k==='id'&&v===workout)?{id:workout,titulo:'Ficha própria'}:null):[{id:workout,titulo:'Ficha própria'}];return Promise.resolve({data,error:fail?{}:null,count:1}).then(resolve,reject)}};return q}};
(async()=>{
const reader=mod.exports.createMysDataReader(db,{id:own,role:'ALUNO'},new AbortController().signal);
for(const name of ['buscar_alunos','consultar_aluno','resumo_shapeos','resumir_acompanhamento'])assert.match(await reader.run(name,'{}'),/fora do acesso/);
assert.equal(calls.length,0);assert.match(await reader.run('resumo_meu_acompanhamento',JSON.stringify({aluno_id:workout})),/definida pelo servidor/);assert.equal(calls.length,0);
const result=JSON.parse(await reader.run('resumo_meu_acompanhamento','{}'));assert.equal(result.dados.totalFichasAtivas,1);assert.equal(result.dados.sessoesConcluidas7Dias,1);assert.equal(calls.length,6);
assert.ok(calls.every(q=>q.filters.some(([k,v])=>k==='aluno_id'&&v===own)));
assert.equal(JSON.parse(await reader.run('consultar_meu_treino',JSON.stringify({treino_id:workout}))).dados.id,workout);
assert.match(await reader.run('consultar_meu_treino',JSON.stringify({treino_id:'33333333-3333-4333-8333-333333333333'})),/fora do seu acesso/);
assert.match(await reader.run('consultar_meu_treino',JSON.stringify({treino_id:workout,aluno_id:workout})),/Ficha inválida/);
fail=true;const unavailable=mod.exports.createMysDataReader(db,{id:own,role:'ALUNO'},new AbortController().signal);assert.match(await unavailable.run('resumo_meu_acompanhamento','{}'),/indisponível/);assert.equal(unavailable.sources.size,0);
assert.deepEqual(Array.from(mod.exports.mysStudentTools,t=>t.function.name),['resumo_meu_acompanhamento','consultar_meu_treino']);
console.log('PASS: Student Mys rejects management tools and forged identities before querying, filters every read by the server identity, denies foreign workouts, and never treats failed reads as empty data.');
})().catch(e=>{console.error(e);process.exit(1)});
