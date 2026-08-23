const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const PAT = process.env.SUPABASE_PAT!
const PROJECT_REF = 'xzxdcjvfapzkpjqnyzzj'
export const SENHA_E2E = 'senha123456'

async function patchAuthConfig(body: Record<string, unknown>): Promise<void> {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        Origin: 'https://supabase.com',
      },
      body: JSON.stringify(body),
    }
  )
  if (!r.ok) {
    throw new Error(`Auth config falhou (${r.status}): ${await r.text()}`)
  }
}

export async function permitirSignupSemEmail(): Promise<void> {
  await patchAuthConfig({ mailer_autoconfirm_enabled: true })
}

export async function restaurarConfirmacaoEmail(): Promise<void> {
  await patchAuthConfig({ mailer_autoconfirm_enabled: false })
}

async function sqlExec(query: string): Promise<unknown> {
  const r = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  if (!r.ok) {
    throw new Error(`SQL falhou (${r.status}): ${await r.text()}`)
  }
  return r.json()
}

export async function limparUsuariosE2E(): Promise<void> {
  await sqlExec(
    `DELETE FROM auth.users WHERE email LIKE '%@shapeosteste.com';`
  )
}

async function criarConta(email: string, nome: string, tipo: 'PERSONAL' | 'ALUNO'): Promise<void> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: SENHA_E2E, data: { nome, tipo } }),
  })
  const data = await r.json()
  if (!data.user?.id) {
    throw new Error(`Signup falhou para ${email}: ${JSON.stringify(data)}`)
  }
}

export async function semearContasE2E(): Promise<{
  personalEmail: string
  alunoEmail: string
}> {
  // Remove restos de execucoes anteriores antes de comecar
  await limparUsuariosE2E()

  const ts = Date.now()
  const personalEmail = `p${ts}@shapeosteste.com`
  const alunoEmail = `a${ts}@shapeosteste.com`

  // Autoconfirm ligado: cria usuario confirmado sem disparar email
  await criarConta(personalEmail, 'Personal E2E', 'PERSONAL')
  await criarConta(alunoEmail, 'Aluno E2E', 'ALUNO')

  // Vincula personal -> aluno
  await sqlExec(`
    INSERT INTO public.personal_alunos (personal_id, aluno_id)
    SELECT p.id, a.id
    FROM public.usuarios p, public.usuarios a
    WHERE p.email = '${personalEmail}' AND a.email = '${alunoEmail}'
    ON CONFLICT DO NOTHING;
  `)

  return { personalEmail, alunoEmail }
}
