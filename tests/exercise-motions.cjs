const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const moduleFixture={exports:{}}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/fitness/exercise-motions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:moduleFixture,exports:moduleFixture.exports,Map,Math})
const {exerciseMotions,findExerciseMotion}=moduleFixture.exports
const seed=fs.readFileSync('supabase/migrations/0003_seed_exercicios.sql','utf8')
const names=[...seed.matchAll(/\('([^']+)',/g)].map(match=>match[1])
assert.equal(names.length,29)
for(const name of names){
 const motion=findExerciseMotion(name)
 assert.ok(motion,`Missing ${name}`)
 assert.ok(motion.frames.length>=2)
 for(const frame of motion.frames)for(const point of Object.values(frame)){
  assert.equal(point.length,2)
  assert.ok(point.every(value=>Number.isFinite(value)&&value>=0&&value<=340))
 }
 assert.ok(motion.hold||motion.frames.some(frame=>JSON.stringify(frame)!==JSON.stringify(motion.frames[0])))
}
assert.equal(new Set(exerciseMotions.map(m=>m.id)).size,exerciseMotions.length)
assert.equal(findExerciseMotion('TRICEPS CORDA').id,'triceps-corda')
assert.equal(findExerciseMotion('Agachamento demonstração 0d852a','d06194d4-c128-4e24-98df-bcc08aae3c48').id,'agachamento-halteres')
assert.equal(findExerciseMotion('Anderson'),undefined)
assert.equal(findExerciseMotion('peito'),undefined)
assert.equal(findExerciseMotion('Supino Reto diferente'),undefined)
console.log('PASS: 29 standard exercises, demo record, distinct motions, valid geometry, ambiguous names never guessed.')
