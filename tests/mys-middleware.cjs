const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('../apps/web/node_modules/typescript')
const source = fs.readFileSync('apps/web/lib/supabase/middleware.ts', 'utf8')
const moduleObject = { exports: {} }
let authCalls = 0
const next = { kind: 'next' }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
  module: moduleObject, exports: moduleObject.exports,
  require: name => name === '@supabase/ssr'
    ? { createServerClient: () => { authCalls++; throw new Error('API authentication belongs to the handler') } }
    : { NextResponse: { next: () => next, redirect: () => { throw new Error('API was redirected') } } },
})
;(async () => {
  for (const pathname of ['/api/mys', '/api', '/api/other']) {
    assert.equal(await moduleObject.exports.updateSession({ nextUrl: { pathname } }), next)
  }
  assert.equal(authCalls, 0)
  const matcherSource = fs.readFileSync('apps/web/middleware.ts', 'utf8')
  assert.match(matcherSource, /export const config\s*=\s*\{/)
  console.log('Mys: APIs bypass page redirects; matcher is statically exported.')
})().catch(error => { console.error(error); process.exit(1) })
