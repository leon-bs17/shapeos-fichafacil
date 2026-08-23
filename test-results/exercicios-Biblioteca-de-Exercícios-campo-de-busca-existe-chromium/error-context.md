# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: exercicios.spec.ts >> Biblioteca de Exercícios >> campo de busca existe
- Location: e2e\exercicios.spec.ts:11:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - main [ref=f1e2]:
    - generic [ref=f1e3]:
      - generic [ref=f1e4]:
        - heading "ShapeOS" [level=3] [ref=f1e5]
        - paragraph [ref=f1e6]: Ficha Fácil · Painel do Personal
      - generic [ref=f1e7]:
        - generic [ref=f1e8]:
          - radiogroup "Tipo de conta" [ref=f1e9]:
            - radio "Sou Personal" [checked] [ref=f1e10] [cursor=pointer]
            - radio "Sou Aluno" [ref=f1e11] [cursor=pointer]
          - generic [ref=f1e12]:
            - text: E-mail
            - textbox "E-mail" [ref=f1e13]:
              - /placeholder: voce@exemplo.com
          - generic [ref=f1e14]:
            - text: Senha
            - textbox "Senha" [ref=f1e15]:
              - /placeholder: ••••••••
          - button "Entrar" [disabled]
        - paragraph [ref=f1e20]:
          - text: Não tem conta?
          - link "Cadastre-se" [ref=f1e21] [cursor=pointer]:
            - /url: /cadastro
  - alert [ref=f1e22]
```

# Test source

```ts
  1   | import type { Page } from '@playwright/test'
  2   | 
  3   | const PERSONAL_EMAIL = 'personal_1787426424337@shapeosteste.com'
  4   | const ALUNO_EMAIL = 'aluno_1787426424337@shapeosteste.com'
  5   | const SENHA = 'senha123456'
  6   | const SUPABASE_URL = 'https://xzxdcjvfapzkpjqnyzzj.supabase.co'
  7   | const PROJECT_REF = 'xzxdcjvfapzkpjqnyzzj'
  8   | 
  9   | async function obterSession(email: string, senha: string) {
  10  |   const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  11  |   if (!apiKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY não definida')
  12  | 
  13  |   const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  14  |     method: 'POST',
  15  |     headers: {
  16  |       apikey: apiKey,
  17  |       'Content-Type': 'application/json',
  18  |     },
  19  |     body: JSON.stringify({ email, password: senha }),
  20  |   })
  21  |   const data = await r.json()
  22  |   if (!data.access_token) throw new Error(`Auth falhou: ${JSON.stringify(data).slice(0, 200)}`)
  23  |   return data
  24  | }
  25  | 
  26  | async function loginViaCookie(page: Page, email: string) {
  27  |   const sessao = await obterSession(email, SENHA)
  28  | 
  29  |   await page.context().addCookies([
  30  |     {
  31  |       name: `sb-${PROJECT_REF}-auth-token`,
  32  |       value: JSON.stringify({
  33  |         access_token: sessao.access_token,
  34  |         refresh_token: sessao.refresh_token,
  35  |       }),
  36  |       domain: '.vercel.app',
  37  |       path: '/',
  38  |     },
  39  |     {
  40  |       name: `sb-${PROJECT_REF}-auth-token`,
  41  |       value: JSON.stringify({
  42  |         access_token: sessao.access_token,
  43  |         refresh_token: sessao.refresh_token,
  44  |       }),
  45  |       domain: 'shapeos-fichafacil.vercel.app',
  46  |       path: '/',
  47  |     },
  48  |   ])
  49  | 
  50  |   await page.goto('/')
  51  |   await page.evaluate((data) => {
  52  |     localStorage.setItem(
  53  |       `sb-${data.ref}-auth-token`,
  54  |       JSON.stringify({
  55  |         access_token: data.access,
  56  |         refresh_token: data.refresh,
  57  |       })
  58  |     )
  59  |   }, { ref: PROJECT_REF, access: sessao.access_token, refresh: sessao.refresh_token })
  60  |   await page.reload()
> 61  |   await page.waitForLoadState('networkidle')
      |              ^ Error: page.waitForLoadState: Test timeout of 30000ms exceeded.
  62  | }
  63  | 
  64  | export async function loginComoPersonal(page: Page) {
  65  |   await loginViaCookie(page, PERSONAL_EMAIL)
  66  | }
  67  | 
  68  | export async function loginComoAluno(page: Page) {
  69  |   await loginViaCookie(page, ALUNO_EMAIL)
  70  | }
  71  | 
  72  | export async function desabilitarCaptcha() {
  73  |   const pat = process.env.SUPABASE_PAT
  74  |   if (!pat) return
  75  |   await fetch(
  76  |     'https://api.supabase.com/v1/projects/xzxdcjvfapzkpjqnyzzj/config/auth',
  77  |     {
  78  |       method: 'PATCH',
  79  |       headers: {
  80  |         Authorization: `Bearer ${pat}`,
  81  |         'Content-Type': 'application/json',
  82  |         Origin: 'https://supabase.com',
  83  |       },
  84  |       body: JSON.stringify({ security_captcha_enabled: false }),
  85  |     }
  86  |   )
  87  | }
  88  | 
  89  | export async function habilitarCaptcha() {
  90  |   const pat = process.env.SUPABASE_PAT
  91  |   if (!pat) return
  92  |   await fetch(
  93  |     'https://api.supabase.com/v1/projects/xzxdcjvfapzkpjqnyzzj/config/auth',
  94  |     {
  95  |       method: 'PATCH',
  96  |       headers: {
  97  |         Authorization: `Bearer ${pat}`,
  98  |         'Content-Type': 'application/json',
  99  |         Origin: 'https://supabase.com',
  100 |       },
  101 |       body: JSON.stringify({
  102 |         security_captcha_enabled: true,
  103 |         security_captcha_provider: 'turnstile',
  104 |         security_captcha_secret: '0x4AAAAAAEY1wHM8wWzYDDeD6-B6ia66BD8',
  105 |       }),
  106 |     }
  107 |   )
  108 | }
  109 | 
```