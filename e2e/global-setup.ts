import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { desabilitarCaptcha } from './auth-helpers'
import {
  limparUsuariosE2E,
  permitirSignupSemEmail,
  restaurarConfirmacaoEmail,
  semearContasE2E,
} from './e2e-db'

export default async function globalSetup() {
  console.log('Desabilitando captcha e confirmacao de email para testes E2E...')
  await desabilitarCaptcha()
  await permitirSignupSemEmail()

  try {
    console.log('Criando contas de teste E2E...')
    const contas = await semearContasE2E()
    console.log(`Contas criadas: ${contas.personalEmail} / ${contas.alunoEmail}`)

    await writeFile(
      resolve(__dirname, '.e2e-accounts.json'),
      JSON.stringify(contas, null, 2)
    )
  } catch (erro) {
    // Nunca deixar o projeto com autoconfirm ligado
    await restaurarConfirmacaoEmail().catch(() => {})
    throw erro
  }
}
