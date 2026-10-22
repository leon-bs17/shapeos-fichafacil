const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
function source(file) {
  return ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
}
const deadlines = { exports: {}, Date }; vm.runInNewContext(source('apps/web/lib/fitness/deadlines.ts'), deadlines)
const helper = { exports: {}, URLSearchParams, require: id => { assert.equal(id, '@/lib/fitness/deadlines'); return deadlines.exports } }
vm.runInNewContext(source('apps/web/lib/fitness/personal-attention.ts'), helper)
const { studentReportHref, resolveLinkedStudent } = helper.exports
const buildStudentAttention = (...args) => structuredClone(helper.exports.buildStudentAttention(...args))
const now = new Date('2026-10-22T12:00:00Z')
const student = { aluno_id: 'a', nome: 'Ana', vinculado_em: '2026-10-01T12:00:00Z', ultima_sessao: '2026-10-15T12:00:00Z', tem_ficha_ativa: true, tem_avaliacao: true }

assert.deepEqual(buildStudentAttention([], now), [])
assert.deepEqual(buildStudentAttention([{ ...student, ultima_sessao: '2026-10-15T12:00:00.001Z' }], now), [])
assert.deepEqual(buildStudentAttention([student], now)[0].motivos, ['inatividade'])
assert.equal(buildStudentAttention([student], now)[0].dias_sem_sessao, 7)
assert.deepEqual(buildStudentAttention([{ ...student, vinculado_em: '2026-10-21T12:00:00Z' }], now), [])
assert.deepEqual(buildStudentAttention([{ ...student, ultima_sessao: null, vinculado_em: '2026-10-21T12:00:00Z' }], now), [])
assert.deepEqual(buildStudentAttention([{ ...student, ultima_sessao: null, tem_ficha_ativa: false, tem_avaliacao: false }], now)[0].motivos, ['inatividade', 'ficha', 'avaliacao'])
assert.deepEqual(buildStudentAttention([{ ...student, ultima_sessao: 'invalid' }], now), [])
assert.deepEqual(buildStudentAttention([{ ...student, ultima_sessao: '2026-10-23T00:00:00Z' }], now), [])
assert.equal(buildStudentAttention([student, student, { ...student, aluno_id: '' }], now).length, 1)
assert.equal(buildStudentAttention([student, { ...student, aluno_id: 'b', ultima_sessao: null }], now)[0].aluno_id, 'b')
const href = new URL(studentReportHref('id & unsafe', 'avaliacao'), 'https://example.com')
assert.equal(href.searchParams.get('aluno'), 'id & unsafe')
assert.equal(href.searchParams.get('aba'), 'avaliacao')
assert.equal(resolveLinkedStudent('other', [student]), '')
assert.equal(resolveLinkedStudent('a', [student]), 'a')
assert.equal(resolveLinkedStudent('a', []), '')
const {calendarDaysUntil,workoutDeadline,assessmentDeadline}=deadlines.exports
const localNow=new Date(2026,9,22,0,5)
assert.equal(calendarDaysUntil('2026-10-22',localNow),0)
assert.equal(calendarDaysUntil('2026-10-23',localNow),1)
assert.equal(calendarDaysUntil('2026-02-30',localNow),null)
assert.equal(calendarDaysUntil('0000-01-01',localNow),null)
assert.equal(calendarDaysUntil('2024-02-29',new Date(2024,1,28,23,59)),1)
assert.equal(calendarDaysUntil('2026-03-09',new Date(2026,2,8,0,5)),1)
assert.equal(workoutDeadline(null,localNow),null)
assert.equal(workoutDeadline('2026-10-30',localNow).warning,false)
assert.equal(workoutDeadline('2026-10-29',localNow).warning,true)
assert.equal(workoutDeadline('2026-10-22',localNow).label,'Ficha vence hoje')
assert.equal(workoutDeadline('2026-10-21',localNow).days,-1)
assert.equal(assessmentDeadline('2026-10-22',null,localNow).pending,true)
assert.equal(assessmentDeadline('2026-10-23',null,localNow).pending,false)
assert.equal(assessmentDeadline('2026-10-21','2026-10-20',localNow).pending,true)
assert.equal(assessmentDeadline('2026-10-21','2026-10-21',localNow).pending,false)
assert.equal(assessmentDeadline('2026-10-21','2026-10-23',localNow).completed,false)
const recentStudent={...student,ultima_sessao:'2026-10-22T00:00:00Z'}
assert.deepEqual(buildStudentAttention([{...recentStudent,valida_ate:'2026-10-29'}],localNow)[0].motivos,['vencimento'])
assert.deepEqual(buildStudentAttention([{...recentStudent,proxima_avaliacao_em:'2026-10-21',ultima_avaliacao:'2026-10-20'}],localNow)[0].motivos,['avaliacao'])
assert.deepEqual(buildStudentAttention([{...recentStudent,proxima_avaliacao_em:'2026-10-21',ultima_avaliacao:'2026-10-21'}],localNow),[])


const service = source('apps/web/services/personal-attention.ts')
function loadService(pages, user = { id: 'personal-own' }) {
  const calls = []
  let index = 0
  const client = {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from(table) {
      calls.push(['from', table])
      const query = { then(resolve, reject) { return Promise.resolve(pages[index++]).then(resolve, reject) } }
      for (const method of ['select', 'eq', 'lte', 'order', 'limit', 'range', 'abortSignal']) query[method] = (...args) => { calls.push([method, ...args]); return query }
      return query
    },
  }
  const context = { exports: {}, require: id => { if (id === '@/lib/fitness/deadlines') return deadlines.exports; assert.equal(id, '@/lib/supabase/client'); return { createClient: () => client } }, Date, Error }
  vm.runInNewContext(service, context)
  return { fetch: context.exports.fetchPersonalAttention, calls }
}
const row = { id: 'a', nome: 'Ana', vinculos: [{ criado_em: student.vinculado_em }], sessoes: [{ inicio: student.ultima_sessao }], avaliacoes: [], fichas: [] }
;(async () => {
  const api = loadService([{ data: Array.from({ length: 200 }, (_, i) => ({ ...row, id: String(i) })), error: null }, { data: [{ ...row, id: '200' }], error: null }])
  const result = await api.fetch()
  assert.equal(result.length, 201)
  assert.equal(result[0].tem_ficha_ativa, false)
  assert.equal(result[0].tem_avaliacao, false)
  assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'vinculos.personal_id' && call[2] === 'personal-own'))
  assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'vinculos.status' && call[2] === 'ATIVO'))
  assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'fichas.personal_id' && call[2] === 'personal-own'))
  assert.ok(api.calls.some(call => call[0] === 'eq' && call[1] === 'sessoes.status' && call[2] === 'CONCLUIDO'))
  assert.ok(api.calls.some(call => call[0] === 'limit' && call[1] === 1 && call[2].referencedTable === 'sessoes'))
  assert.ok(api.calls.some(call => call[0] === 'range' && call[1] === 200 && call[2] === 399))
  const datesApi=loadService([{data:[{...row,vinculos:[{criado_em:student.vinculado_em,proxima_avaliacao_em:'2026-10-24'}],avaliacoes:[{id:'assessment',data:'2026-10-10'}],fichas:[{id:'workout',titulo:'Treino A',valida_ate:'2026-10-29'}]}],error:null}])
  const [snapshot]=await datesApi.fetch()
  assert.equal(snapshot.valida_ate,'2026-10-29')
  assert.equal(snapshot.proxima_avaliacao_em,'2026-10-24')
  assert.equal(snapshot.ultima_avaliacao,'2026-10-10')
  assert.ok(datesApi.calls.some(call=>call[0]==='order'&&call[1]==='valida_ate'&&call[2].nullsFirst===false))
  await assert.rejects(loadService([], null).fetch(), /Sessão expirada/)
  await assert.rejects(loadService([{ data: null, error: new Error('Database unavailable') }]).fetch(), /Database unavailable/)
  await assert.rejects(loadService([{ data: [{ ...row, vinculos: [] }], error: null }]).fetch(), /Vínculo indisponível/)
  console.log('Personal attention checks passed (boundaries, grace period, grouping, links, membership, ownership, pagination and errors).')
})().catch(error => { console.error(error); process.exitCode = 1 })

