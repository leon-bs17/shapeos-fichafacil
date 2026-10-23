const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
function load(file, imports = {}) {
  const exports = {}
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  assert.equal(compiled.diagnostics.length, 0)
  vm.runInNewContext(compiled.outputText, { exports, require: id => imports[id] ?? require(id), Date, Map, Set, Error, AbortController })
  return exports
}
const deadlines = load('apps/web/lib/fitness/deadlines.ts')
const periods = load('apps/web/lib/fitness/period-comparison.ts', { './deadlines': deadlines })
const { personalReportSummary } = load('apps/web/lib/fitness/personal-report.ts', { './period-comparison': periods, './deadlines': deadlines })
function session(id, inicio, status = 'CONCLUIDO') {
  return { id, aluno_id: 'student', treino_id: 'workout', titulo: 'Treino A', inicio, status, prescricao: [], series: [], observacoes: '', fim: null }
}
for (const now of [new Date(2026, 9, 23, 15), new Date(2024, 2, 1, 0, 1), new Date(2026, 2, 9, 1), new Date(2026, 10, 2, 1)]) for (const days of [7, 30, 90]) {
  const w = periods.comparisonWindows(days, now)
  const rows = [session('first', w.start), session('progress', w.start, 'EM_ANDAMENTO'), session('previous', w.previousStart),
    session('future', new Date(Date.parse(w.end) + 1).toISOString()), session('old', new Date(Date.parse(w.previousStart) - 1).toISOString()), session('invalid', 'invalid')]
  const assessments = [{ id: 'old', data: w.previousStartDate, peso: null }, { id: 'current', data: w.startDate, peso: 62 }, { id: 'future', data: '2099-01-01' }]
  const result = personalReportSummary(rows, assessments, w)
  assert.equal(result.current.length, 2); assert.equal(result.completionRate, 50)
  assert.equal(result.comparison.current.sessions, 1); assert.equal(result.comparison.previous.sessions, 1)
  assert.equal(result.assessments.length, 1); assert.equal(result.latest.id, 'current')
  assert.equal(result.points.length, days); assert.equal(new Set(result.points.map(p => p.date)).size, days)
  assert.equal(result.points[0].date, w.startDate); assert.equal(result.points.at(-1).date, w.endDate)
  assert.equal(result.points.reduce((n, p) => n + p.current, 0), 1); assert.equal(result.points.reduce((n, p) => n + p.previous, 0), 1)
  const empty = personalReportSummary([], [], w); assert.equal(empty.completionRate, null); assert.equal(empty.latest, undefined)
  const onlyOld = personalReportSummary([], [assessments[0]], w); assert.equal(onlyOld.assessments.length, 0); assert.equal(onlyOld.latest.id, 'old')
}
function setup(options = {}) {
  const calls = [], rows = Array.from({ length: 1205 }, (_, i) => ({ id: String(i) }))
  const db = { auth: { getUser: async () => ({ data: { user: options.noUser ? null : { id: 'personal' } }, error: null }) }, from(table) {
    const call = { table, filters: [], orders: [] }; calls.push(call)
    const q = { select(fields) { call.fields = fields; return q }, eq(k, v) { call.filters.push(['eq', k, v]); return q },
      gte(k, v) { call.filters.push(['gte', k, v]); return q }, lte(k, v) { call.filters.push(['lte', k, v]); return q },
      order(k, v) { call.orders.push([k, v]); return q }, range(a, b) { call.range = [a, b]; return q },
      abortSignal(s) { call.signal = s; return q }, maybeSingle() { return q }, then(resolve, reject) {
        const data = table === 'personal_alunos' ? (options.unlinked ? null : { status: options.inactive ? 'INATIVO' : 'ATIVO' }) : rows.slice(call.range[0], call.range[0] + 137)
        return Promise.resolve({ data, error: options.error === table ? Error('db') : null }).then(resolve, reject)
      } }; return q
  } }
  return { ...load('apps/web/services/personal-report.ts', { '@/lib/supabase/client': { createClient: () => db }, '@/lib/fitness/period-comparison': periods }), calls }
}
;(async () => {
  const api = setup(), controller = new AbortController(), data = await api.fetchPersonalReport('student', 30, controller.signal)
  assert.equal(data.sessions.length, 1205); assert.equal(data.assessments.length, 1205)
  assert.ok(api.calls.every(c => c.signal === controller.signal))
  assert.ok(api.calls.every(c => c.filters.some(([op, k, v]) => op === 'eq' && k === 'aluno_id' && v === 'student')))
  assert.ok(api.calls[0].filters.some(([op, k, v]) => op === 'eq' && k === 'personal_id' && v === 'personal'))
  for (const table of ['sessoes_treino', 'avaliacoes_fisicas']) {
    const calls = api.calls.filter(c => c.table === table)
    assert.ok(calls.length > 2); assert.equal(calls[1].range[0], 137)
    assert.ok(calls.every(c => c.orders.length === 2))
  }
  const sessions = api.calls.filter(c => c.table === 'sessoes_treino')
  assert.ok(sessions.every(c => !c.filters.some(([, k]) => k === 'status')))
  assert.ok(sessions.every(c => c.filters.some(([op, k, v]) => op === 'gte' && k === 'inicio' && v === data.window.previousStart)))
  assert.ok(sessions.every(c => c.filters.some(([op, k, v]) => op === 'lte' && k === 'inicio' && v === data.window.end)))
  for (const options of [{ unlinked: true }, { inactive: true }, { error: 'personal_alunos' }]) {
    const denied = setup(options); await assert.rejects(denied.fetchPersonalReport('student', 30)); assert.equal(denied.calls.length, 1)
  }
  const noUser = setup({ noUser: true }); await assert.rejects(noUser.fetchPersonalReport('student', 30)); assert.equal(noUser.calls.length, 0)
  await assert.rejects(setup().fetchPersonalReport('', 30)); await assert.rejects(setup().fetchPersonalReport('student', 8))
  await assert.rejects(setup({ error: 'sessoes_treino' }).fetchPersonalReport('student', 30), /sessões/)
  await assert.rejects(setup({ error: 'avaliacoes_fisicas' }).fetchPersonalReport('student', 30), /avaliações/)
  console.log('PASS: report periods, DST/leap year, current/previous daily series, future exclusions, session completion denominator, missing assessments, ownership, pagination beyond 1000, cancellation and read errors.')
})().catch(error => { console.error(error); process.exitCode = 1 })
