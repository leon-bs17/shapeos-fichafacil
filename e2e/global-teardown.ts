import { habilitarCaptcha } from './auth-helpers'

export default async function globalTeardown() {
  console.log('Reabilitando captcha após testes E2E...')
  await habilitarCaptcha()
}
