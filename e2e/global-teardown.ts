import { unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { habilitarCaptcha } from './auth-helpers'
import { limparUsuariosE2E, restaurarConfirmacaoEmail } from './e2e-db'

export default async function globalTeardown() {
  console.log('Reabilitando captcha e confirmacao de email...')
  await habilitarCaptcha()
  await restaurarConfirmacaoEmail()

  console.log('Removendo contas de teste do banco...')
  await limparUsuariosE2E()

  await unlink(resolve(__dirname, '.e2e-accounts.json')).catch(() => {})
}
