import type { Page } from '@playwright/test'

const PERSONAL_EMAIL = 'personal_1787426424337@shapeosteste.com'
const ALUNO_EMAIL = 'aluno_1787426424337@shapeosteste.com'
const SENHA = 'senha123456'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const CAPTCHA_SECRET = process.env.SUPABASE_CAPTCHA_SECRET!

async function loginViaPageAuth(page: Page, email: string) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  await page.evaluate(
    async ({ url, key, email, senha }) => {
      const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: senha }),
      })
      const data = await r.json()
      if (!data.access_token) throw new Error('Auth failed')

      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: data.expires_at,
        token_type: 'bearer',
        user: data.user,
      }

      const projectRef = new URL(url).hostname.split('.')[0]
      localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify(session)
      )
      document.cookie = `sb-${projectRef}-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${data.expires_in}; SameSite=Lax`
    },
    { url: SUPABASE_URL, key: ANON_KEY, email, senha: SENHA }
  )

  await page.reload()
  await page.waitForLoadState('networkidle')
}

export async function loginComoPersonal(page: Page) {
  await loginViaPageAuth(page, PERSONAL_EMAIL)
}

export async function loginComoAluno(page: Page) {
  await loginViaPageAuth(page, ALUNO_EMAIL)
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
  if (!pat || !CAPTCHA_SECRET) return
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
        security_captcha_secret: CAPTCHA_SECRET,
      }),
    }
  )
}
