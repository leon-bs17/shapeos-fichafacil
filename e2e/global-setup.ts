import { desabilitarCaptcha } from './auth-helpers'

export default async function globalSetup() {
  console.log('Desabilitando captcha para testes E2E...')
  await desabilitarCaptcha()
}
