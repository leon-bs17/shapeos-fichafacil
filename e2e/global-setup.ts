import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { semearContasE2E } from './e2e-db'

export default async function globalSetup() {
  console.log('Criando contas no Supabase E2E isolado...')
  const contas = await semearContasE2E()

  await writeFile(
    resolve(__dirname, '.e2e-accounts.json'),
    JSON.stringify(contas, null, 2)
  )
}
