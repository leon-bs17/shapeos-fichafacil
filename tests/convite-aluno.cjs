const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('supabase/functions/convite-aluno/index.ts', 'utf8').replace(/^import .*\n/gm, '')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const origin = 'https://shapeos-fichafacil.vercel.app'

function fixture(options = {}) {
  let handler
  const calls = { mail: 0, lookup: 0, rate: 0 }
  const admin = {
    auth: {
      getUser: async () => ({ data: { user: options.invalidSession ? null : { id: 'personal-id' } }, error: null }),
      admin: { inviteUserByEmail: async (email, config) => {
        calls.mail++; calls.email = email; calls.config = config
        return options.mailResult || { data: { user: { id: 'new-student' } }, error: null }
      } },
    },
    from: () => ({ select: fields => ({ eq: () => ({ maybeSingle: async () => {
      if (fields === 'tipo, status_conta') return { data: options.profile || { tipo: 'PERSONAL', status_conta: 'ATIVO' }, error: null }
      calls.lookup++
      return { data: options.existing || null, error: options.lookupError || null }
    } }) }) }),
    rpc: async () => { calls.rate++; return { data: options.allowed !== false, error: options.limitError || null } },
  }
  vm.runInNewContext(code, {
    URL, Request, Response, console: { error() {} },
    sdkCorsHeaders: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
    createClient: () => admin,
    Deno: { env: { get: () => undefined }, serve: fn => { handler = fn } },
  })
  return { calls, request: (body = { email: 'student@example.test' }, headers = {}, method = 'POST') => handler(new Request(origin, {
    method, headers: { Origin: origin, Authorization: 'Bearer valid-session', ...headers },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  })) }
}

async function run() {
  let f = fixture(), r = await f.request(null, {}, 'OPTIONS')
  assert.equal(r.status, 204)
  assert.equal(r.headers.get('access-control-allow-origin'), origin)
  assert.match(r.headers.get('access-control-allow-methods'), /POST/)
  assert.equal(f.calls.mail, 0)
  assert.equal((await f.request(null, {}, 'GET')).status, 405)
  assert.equal((await f.request(undefined, { Origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await f.request(undefined, { Authorization: '' })).status, 401)
  for (const body of [null, {}, { email: 42 }, { email: 'bad@' }, '{']) assert.equal((await f.request(body)).status, 400)
  f = fixture({ invalidSession: true }); assert.equal((await f.request()).status, 401)
  for (const profile of [{ tipo: 'ALUNO', status_conta: 'ATIVO' }, { tipo: 'PERSONAL', status_conta: 'PENDENTE' }]) {
    f = fixture({ profile }); assert.equal((await f.request()).status, 403); assert.equal(f.calls.mail, 0)
  }
  f = fixture({ allowed: false }); assert.equal((await f.request()).status, 429); assert.equal(f.calls.mail, 0)
  f = fixture({ limitError: { code: 'missing_rpc' } }); assert.equal((await f.request()).status, 503)
  f = fixture({ existing: { id: 'student-id', tipo: 'ALUNO', status_conta: 'ATIVO' } })
  r = await f.request(); assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { data: { user: { id: 'student-id', novo: false } } }); assert.equal(f.calls.mail, 0)
  for (const existing of [{ id: 'admin-id', tipo: 'ADMIN', status_conta: 'ATIVO' }, { id: 'student-id', tipo: 'ALUNO', status_conta: 'INATIVO' }]) {
    f = fixture({ existing }); assert.equal((await f.request()).status, 409); assert.equal(f.calls.mail, 0)
  }
  f = fixture(); r = await f.request({ email: '  STUDENT@Example.test  ' })
  assert.equal(r.status, 200); assert.equal(f.calls.email, 'student@example.test')
  assert.equal(f.calls.config.redirectTo, origin + '/login'); assert.equal(f.calls.config.data.tipo, 'ALUNO')
  assert.deepEqual(await r.json(), { data: { user: { id: 'new-student', novo: true } } })
  for (const [status, expected] of [[429, 429], [500, 502]]) {
    f = fixture({ mailResult: { data: { user: null }, error: { status, code: 'mail_error', message: 'private provider detail' } } })
    r = await f.request(); assert.equal(r.status, expected)
    assert.equal(r.headers.get('access-control-allow-origin'), origin)
    assert.doesNotMatch(await r.text(), /private provider detail/)
  }
  console.log('PASS: preflight, CORS on errors, payload validation, auth, roles, limiter, existing/new students and provider failures')
}
run().catch(error => { console.error(error); process.exit(1) })
