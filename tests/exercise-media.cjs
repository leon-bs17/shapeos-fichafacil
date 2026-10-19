const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const catalog = require('../apps/web/lib/fitness/exercise-media-catalog.json')
const fixture = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/fitness/exercise-media.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, { module: fixture, exports: fixture.exports, URL, Map, require: () => catalog })
const { resolveExerciseMedia, validateExerciseUrl, safeExerciseUrl } = fixture.exports
const seededNames = [...fs.readFileSync('supabase/migrations/0003_seed_exercicios.sql', 'utf8').matchAll(/^\s*\('([^']+)'/gm)].map(m => m[1])
assert.equal(seededNames.length, 29)
for (const name of seededNames) assert.ok(resolveExerciseMedia(name), name)
assert.equal(new Set(seededNames.map(name => resolveExerciseMedia(name).src)).size, 29)
assert.equal(resolveExerciseMedia('PUXADA FRONTAL').src, '/exercise-media/puxada-frontal.gif')
const demoId = 'd06194d4-c128-4e24-98df-bcc08aae3c48'
assert.equal(resolveExerciseMedia('Agachamento demonstração 0d852a', null, demoId).src, resolveExerciseMedia('Agachamento com Halteres').src)
assert.equal(resolveExerciseMedia('Supino Reto', null, demoId).src, resolveExerciseMedia('Supino Reto').src)
for (const name of ['Anderson', 'peito', 'Puxada Frontal diferente', 'Supino Reto (Halteres)']) assert.equal(resolveExerciseMedia(name), null)
assert.equal(resolveExerciseMedia('Supino Reto', 'https://example.com/supino.gif?token=123').kind, 'image')
assert.equal(resolveExerciseMedia('Puxada Frontal', 'https://example.com/propria.mp4').kind, 'video')
assert.equal(resolveExerciseMedia('Supino Reto', 'https://youtube.com/watch?v=123').src, resolveExerciseMedia('Supino Reto').src)
assert.equal(resolveExerciseMedia('Anderson', 'https://youtube.com/watch?v=123'), null)
for (const value of ['javascript:alert(1)', '//example.com/a.gif', 'http://example.com/a.gif', 'https://user:pass@example.com/a.gif']) {
  assert.equal(safeExerciseUrl(value), null)
  assert.throws(() => validateExerciseUrl(value))
}
assert.equal(validateExerciseUrl(''), null)
for (const media of catalog) {
  assert.ok(media.src.startsWith('/') || safeExerciseUrl(media.src))
  if (media.source) assert.ok(safeExerciseUrl(media.source))
  assert.ok(media.credit)
}
const gif = fs.readFileSync('apps/web/public/exercise-media/puxada-frontal.gif')
assert.equal(gif.subarray(0, 3).toString(), 'GIF')
console.log('PASS: all 29 seeded movements, 30 unique media, verified demo identity, custom priority and safe links.')
