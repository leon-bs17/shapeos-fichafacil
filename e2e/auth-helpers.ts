import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ContasE2E } from './e2e-db'
import { SENHA_E2E } from './e2e-db'

export function carregarContas(): ContasE2E {
  const caminho = resolve(__dirname, '.e2e-accounts.json')
  try {
    return JSON.parse(readFileSync(caminho, 'utf-8')) as ContasE2E
  } catch {
    throw new Error(
      'Arquivo .e2e-accounts.json nao encontrado. O global-setup deve rodar antes dos testes.'
    )
  }
}

async function loginViaInterface(
  page: Page,
  email: string,
  tipo: 'PERSONAL' | 'ALUNO'
) {
  await page.goto('/login')

  await page
    .getByTestId(tipo === 'ALUNO' ? 'role-tab-aluno' : 'role-tab-personal')
    .click()

  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(SENHA_E2E)
  await page.getByTestId('login-submit-button').click()

  const destino = tipo === 'ALUNO' ? '/painel' : '/'
  await page.waitForURL((url) => url.pathname === destino)
}

export async function loginComoPersonal(page: Page) {
  const { personalEmail } = carregarContas()
  await loginViaInterface(page, personalEmail, 'PERSONAL')
}

export async function loginComoAluno(page: Page) {
  const { alunoEmail } = carregarContas()
  await loginViaInterface(page, alunoEmail, 'ALUNO')
}
