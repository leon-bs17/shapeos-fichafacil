import type { Page } from '@playwright/test'

const PERSONAL_EMAIL = 'personal_1787426424337@shapeosteste.com'
const ALUNO_EMAIL = 'aluno_1787426424337@shapeosteste.com'
const SENHA = 'senha123456'
const SUPABASE_URL = 'https://xzxdcjvfapzkpjqnyzzj.supabase.co'
const PROJECT_REF = 'xzxdcjvfapzkpjqnyzzj'

async function obterSession(email: string, senha: string) {
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não definida')

  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: senha }),
  })
  const data = await r.json()
  if (!data.access_token) throw new Error(`Auth falhou: ${JSON.stringify(data).slice(0, 200)}`)
  return data
}

async function loginViaCookie(page: Page, email: string) {
  const sessao = await obterSession(email, SENHA)

  await page.context().addCookies([
    {
      name: `sb-${PROJECT_REF}-auth-token`,
      value: JSON.stringify({
        access_token: sessao.access_token,
        refresh_token: sessao.refresh_token,
      }),
      domain: '.vercel.app',
      path: '/',
    },
    {
      name: `sb-${PROJECT_REF}-auth-token`,
      value: JSON.stringify({
        access_token: sessao.access_token,
        refresh_token: sessao.refresh_token,
      }),
      domain: 'shapeos-fichafacil.vercel.app',
      path: '/',
    },
  ])
}

export async function loginComoPersonal(page: Page) {
  await loginViaCookie(page, PERSONAL_EMAIL)
}

export async function loginComoAluno(page: Page) {
  await loginViaCookie(page, ALUNO_EMAIL)
}

export async function desabilitarCaptcha() {
  const pat = process.env.SUPABASE_PAT
  if (!pat) return
  await fetch(
    'https://api.supabase.com/v1/projects/xzxdcjvfapzkpjqnyzzj/config/auth',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        Origin: 'https://supabase.com',
      },
      body: JSON.stringify({ security_captcha_enabled: false }),
    }
  )
}

export async function habilitarCaptcha() {
  const pat = process.env.SUPABASE_PAT
  if (!pat) return
  await fetch(
    'https://api.supabase.com/v1/projects/xzxdcjvfapzkpjqnyzzj/config/auth',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
        Origin: 'https://supabase.com',
      },
      body: JSON.stringify({
        security_captcha_enabled: true,
        security_captcha_provider: 'turnstile',
        security_captcha_secret: '0x4AAAAAAEY1wHM8wWzYDDeD6-B6ia66BD8',
      }),
    }
  )
}
