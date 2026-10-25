const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function loadModule(path, requireMock = require, globals = {}) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, require: requireMock, URL, URLSearchParams, ...globals })
  return module.exports
}
const { prepareStudentInvite, saveStudentInvitePassword } = loadModule('apps/web/lib/auth/student-invite.ts')

function fixture(options = {}) {
  const calls = { credentials: [], updates: [] }
  const verify = async data => { calls.credentials.push(data); return { error: options.tokenError ? Error('expired') : null } }
  const client = {
    auth: {
      verifyOtp: verify, exchangeCodeForSession: verify, setSession: verify,
      getUser: async () => ({ data: { user: options.missingUser ? null : { id: options.userId || 'student', email: 'student@example.test' } }, error: null }),
      updateUser: async data => { calls.updates.push(data); return { error: options.updateError ? Error('failed') : null } },
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { tipo: options.role || 'ALUNO', status_conta: options.status || 'ATIVO' }, error: null }) }) }) }),
  }
  return { client, calls }
}
const url = value => new URL('https://shapeos-fichafacil.vercel.app/aceitar-convite' + value)

async function run() {
  for (const suffix of ['', '?token_hash=hash&type=recovery', '#access_token=a&refresh_token=b&type=recovery', '?error=expired']) {
    const f = fixture(); await assert.rejects(prepareStudentInvite(f.client, url(suffix)), /inválido|expirou/)
    assert.equal(f.calls.credentials.length, 0)
  }
  for (const suffix of ['?token_hash=hash&type=invite', '?code=code', '#access_token=a&refresh_token=b&type=invite']) {
    const f = fixture(); const student = await prepareStudentInvite(f.client, url(suffix))
    assert.equal(student.id, 'student'); assert.equal(f.calls.credentials.length, 1)
    await saveStudentInvitePassword(f.client, student.id, 'Senha12345', 'Senha12345')
    assert.deepEqual(JSON.parse(JSON.stringify(f.calls.updates)), [{ password: 'Senha12345' }])
  }
  for (const options of [{ tokenError: true }, { missingUser: true }, { role: 'PERSONAL' }, { role: 'ADMIN' }, { status: 'BLOQUEADO' }]) {
    const f = fixture(options); await assert.rejects(prepareStudentInvite(f.client, url('?token_hash=hash&type=invite')))
    assert.equal(f.calls.updates.length, 0)
  }
  for (const [password, confirmation] of [['short1', 'short1'], ['12345678', '12345678'], ['abcdefgh', 'abcdefgh'], ['Senha1234', 'Other1234']]) {
    const f = fixture(); await assert.rejects(saveStudentInvitePassword(f.client, 'student', password, confirmation))
    assert.equal(f.calls.updates.length, 0)
  }
  let f = fixture({ userId: 'different-account' }); await assert.rejects(saveStudentInvitePassword(f.client, 'student', 'Senha1234', 'Senha1234')); assert.equal(f.calls.updates.length, 0)
  f = fixture({ updateError: true }); await assert.rejects(saveStudentInvitePassword(f.client, 'student', 'Senha1234', 'Senha1234'), /Não foi possível salvar/)

  // Invite credentials must reach their page before role routing redirects to /painel.
  for (const user of [null, { id: 'student' }]) {
    const response = { cookies: { getAll: () => [] }, kind: 'next' }
    const middleware = loadModule('apps/web/lib/supabase/middleware.ts', name => name === '@supabase/ssr' ? {
      createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => { throw Error('Invitation page was role-routed') } }),
    } : { NextResponse: { next: () => response, redirect: () => { throw Error('Invitation page redirected') } } }, { process: { env: {} } })
    assert.equal(await middleware.updateSession({ nextUrl: { pathname: '/aceitar-convite' }, cookies: { getAll: () => [] } }), response)
  }
  console.log('PASS: invitation credentials, expired/wrong links, active-student authorization, password validation, session switching, save errors and middleware')
}
run().catch(error => { console.error(error); process.exit(1) })
