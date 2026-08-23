import type { Page } from '@playwright/test'

const PERSONAL_EMAIL = 'personal_1787426424337@shapeosteste.com'
const ALUNO_EMAIL = 'aluno_1787426424337@shapeosteste.com'
const SENHA = 'senha123456'

async function loginViaPageAuth(page: Page, email: string) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')

  // Use the Supabase auth REST API from the browser context
  // This sets cookies on the correct domain automatically
  await page.evaluate(
    async ({ email, senha }) => {
      const url = 'https://xzxdcjvfapzkpjqnyzzj.supabase.co'
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6eGRjanZmYXB6a3BqcW55enpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MTk2MzQsImV4cCI6MjEwMjk5NTYzNH0.K7A-oNK6603KwI_Fh6qCixpF4UWn30GNvUIyxq6GRp4'

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

      // Store session in localStorage for the Supabase browser client
      const session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: data.expires_at,
        token_type: 'bearer',
        user: data.user,
      }

      // Set the cookie in the format @supabase/ssr expects
      // Also store in localStorage as a fallback
      localStorage.setItem(
        'sb-xzxdcjvfapzkpjqnyzzj-auth-token',
        JSON.stringify(session)
      )

      // Set the cookie that the middleware reads
      document.cookie = `sb-xzxdcjvfapzkpjqnyzzj-auth-token=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${data.expires_in}; SameSite=Lax`
    },
    { email, senha: SENHA }
  )

  // Reload so the app picks up the session
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
