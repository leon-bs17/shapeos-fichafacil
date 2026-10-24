const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../apps/web/lib/fitness/weekly-frequency.ts'), 'utf8')
const compiled = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.CommonJS } })
assert.equal(compiled.diagnostics.length, 0)
const exportsObject = {}
vm.runInNewContext(compiled.outputText, { exports: exportsObject })
const { weeklyFrequency } = exportsObject
assert.equal(weeklyFrequency([]).length, 0)
for (const length of [7, 30, 90]) {
  const points = Array.from({ length }, (_, index) => ({
    date: `current-${index}`, previousDate: `previous-${index}`,
    current: index % 3, previous: index % 4,
  }))
  const original = JSON.stringify(points), weeks = weeklyFrequency(points)
  assert.equal(weeks.length, Math.ceil(length / 7))
  for (const key of ['current', 'previous']) {
    assert.equal(weeks.reduce((sum, week) => sum + week[key], 0), points.reduce((sum, day) => sum + day[key], 0))
  }
  weeks.forEach((week, index) => {
    const first = index * 7, last = Math.min(length - 1, first + 6)
    assert.equal(week.start, points[first].date)
    assert.equal(week.previousStart, points[first].previousDate)
    assert.equal(week.end, points[last].date)
    assert.equal(week.previousEnd, points[last].previousDate)
    assert.equal(week.days, last - first + 1)
  })
  assert.equal(weeks.at(-1).days, length % 7 || 7)
  assert.equal(JSON.stringify(points), original)
}
const boundary = Array.from({ length: 30 }, (_, i) => ({ date: String(i), previousDate: String(i + 30), current: [6, 7, 28, 29].includes(i) ? 1 : 0, previous: i === 29 ? 2 : 0 }))
assert.equal(JSON.stringify(weeklyFrequency(boundary).map(w => w.current)), '[1,1,0,0,2]')
assert.equal(weeklyFrequency(boundary).at(-1).previous, 2)
console.log('Weekly frequency: exact totals, seven-day boundaries, equal prior blocks, and partial weeks passed.')
