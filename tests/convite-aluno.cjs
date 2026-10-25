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
    from: table => {
      let fields='',mode='select',payload
      const result=()=>{
        if(table==='usuarios'){
          if(fields.includes('nome'))return {data:options.profile||{tipo:'PERSONAL',status_conta:'ATIVO',nome:'Personal Teste'},error:null}
          calls.lookup++;return {data:options.existing||null,error:options.lookupError||null}
        }
        if(table==='personal_alunos'){
          if(mode==='insert')throw Error('Consent bypass: direct link INSERT')
          return {data:options.link||null,error:null}
        }
        if(mode==='update'){calls.lastUpdate=payload;return {data:null,error:null}}
        if(mode==='insert')return {data:{id:'invitation-id',expira_em:'2026-10-26T04:00:00Z'},error:null}
        return {data:options.pending||null,error:null}
      }
      const q={select:value=>{fields=value;return q},eq:()=>q,gt:()=>q,lte:()=>q,
        insert:value=>{mode='insert';payload=value;return q},update:value=>{mode='update';payload=value;return q},
        maybeSingle:async()=>result(),single:async()=>result(),then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)}
      return q
    },
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
  assert.deepEqual(await r.json(), { data: { convite: { id: 'invitation-id', expira_em: '2026-10-26T04:00:00Z', estado: 'PENDENTE', novo: false } } }); assert.equal(f.calls.mail, 0)
  for (const existing of [{ id: 'admin-id', tipo: 'ADMIN', status_conta: 'ATIVO' }, { id: 'student-id', tipo: 'ALUNO', status_conta: 'INATIVO' }]) {
    f = fixture({ existing }); assert.equal((await f.request()).status, 409); assert.equal(f.calls.mail, 0)
  }
  f = fixture(); r = await f.request({ email: '  STUDENT@Example.test  ' })
  assert.equal(r.status, 200); assert.equal(f.calls.email, 'student@example.test')
  assert.equal(f.calls.config.redirectTo, origin + '/aceitar-convite'); assert.equal(f.calls.config.data.tipo, 'ALUNO')
  assert.deepEqual(await r.json(), { data: { convite: { id: 'invitation-id', expira_em: '2026-10-26T04:00:00Z', estado: 'PENDENTE', novo: true } } })
  f=fixture({existing:{id:'student-id',tipo:'ALUNO',status_conta:'ATIVO'},link:{id:'link-id',status:'ATIVO'}}); assert.equal((await f.request()).status,409); assert.equal(f.calls.mail,0)
  f=fixture({pending:{id:'pending-id',expira_em:'2026-10-26T04:00:00Z'}}); r=await f.request();assert.equal((await r.json()).data.convite.id,'pending-id');assert.equal(f.calls.mail,0)
  for (const [status, expected] of [[429, 429], [500, 502]]) {
    f = fixture({ mailResult: { data: { user: null }, error: { status, code: 'mail_error', message: 'private provider detail' } } })
    r = await f.request(); assert.equal(r.status, expected)
    assert.equal(r.headers.get('access-control-allow-origin'), origin)
    assert.equal(f.calls.lastUpdate.estado,'CANCELADO')
    assert.doesNotMatch(await r.text(), /private provider detail/)
  }
  console.log('PASS: preflight, CORS on errors, payload validation, auth, roles, limiter, pending consent (no direct links), existing/new students and provider failures')
}
run().catch(error => { console.error(error); process.exit(1) })
