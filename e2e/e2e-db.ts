export interface ContasE2E {
  personalEmail: string
  personalId: string
  alunoEmail: string
  alunoId: string
}

export const SENHA_E2E = 'senha123456'

function envObrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error('Variável obrigatória ausente: ' + nome)
  return valor
}

const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  ''
const SERVICE_ROLE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function validarAmbienteE2E() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
    throw new Error(
      'E2E exige E2E_SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  const host = new URL(SUPABASE_URL).hostname
  const local = host === '127.0.0.1' || host === 'localhost'
  if (!local && process.env.E2E_ALLOW_REMOTE !== 'true') {
    throw new Error(
      'Por seguranca, E2E remoto esta bloqueado. Use Supabase local ou E2E_ALLOW_REMOTE=true em um ambiente dedicado.'
    )
  }
}

export async function adminRequest(
  path: string,
  init: RequestInit
): Promise<Response> {
  validarAmbienteE2E()
  return fetch(SUPABASE_URL + path, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

async function criarConta(
  email: string,
  nome: string,
  tipo: 'PERSONAL' | 'ALUNO'
): Promise<string> {
  const response = await adminRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: SENHA_E2E,
      email_confirm: true,
      user_metadata: { nome, tipo },
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.id) {
    throw new Error(
      'Criação de usuário E2E falhou: ' + JSON.stringify(data)
    )
  }

  // Test-only account approval in the isolated database; never bypass this in the app.
  const approval = await adminRequest('/rest/v1/usuarios?id=eq.' + data.id, {
    method: 'PATCH', body: JSON.stringify({ status_conta: 'ATIVO' }),
  })
  if (!approval.ok) throw new Error('Falha ao ativar fixture E2E: ' + await approval.text())

  return data.id as string
}

async function removerUsuario(id: string): Promise<void> {
  const response = await adminRequest('/auth/v1/admin/users/' + id, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 404) {
    throw new Error(
      'Falha ao remover usuario E2E (' +
        response.status +
        '): ' +
        (await response.text())
    )
  }
}

export async function obterToken(email: string): Promise<string> {
  const response = await fetch(
    SUPABASE_URL + '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: SENHA_E2E }),
    }
  )

  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error(
      'Login do personal E2E falhou: ' + JSON.stringify(data)
    )
  }

  return data.access_token as string
}

async function vincularAluno(
  personalId: string,
  alunoId: string,
  alunoEmail: string
): Promise<void> {
  const invitationResponse = await adminRequest('/rest/v1/convites_aluno', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ personal_id: personalId, personal_nome: 'Personal E2E', email: alunoEmail }),
  })
  if (!invitationResponse.ok) throw new Error('Falha ao criar convite E2E: ' + await invitationResponse.text())
  const [invitation] = await invitationResponse.json()
  const token = await obterToken(alunoEmail)
  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/responder_convite_aluno', {
    method: 'POST', headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_convite_id: invitation.id, p_aceitar: true }),
  })
  if (!response.ok) throw new Error('Falha ao aceitar convite E2E: ' + await response.text())
}

export async function semearContasE2E(): Promise<ContasE2E> {
  validarAmbienteE2E()
  envObrigatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const ts = Date.now()
  const personalEmail = 'p' + ts + '@shapeosteste.com'
  const alunoEmail = 'a' + ts + '@shapeosteste.com'

  let personalId: string | null = null
  let alunoId: string | null = null

  try {
    personalId = await criarConta(personalEmail, 'Personal E2E', 'PERSONAL')
    alunoId = await criarConta(alunoEmail, 'Aluno E2E', 'ALUNO')
    await vincularAluno(personalId, alunoId, alunoEmail)

    return {
      personalEmail,
      personalId,
      alunoEmail,
      alunoId,
    }
  } catch (erro) {
    if (alunoId) await removerUsuario(alunoId).catch(() => undefined)
    if (personalId) await removerUsuario(personalId).catch(() => undefined)
    throw erro
  }
}

export async function removerContasE2E(
  contas: ContasE2E
): Promise<void> {
  // Both accounts reference the same invitation/link. Sequential deletion avoids
  // concurrent cascading FK updates locking the same rows in opposite order.
  await removerUsuario(contas.alunoId)
  await removerUsuario(contas.personalId)
}
