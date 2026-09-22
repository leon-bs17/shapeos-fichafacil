import { readFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ContasE2E } from './e2e-db'
import { removerContasE2E } from './e2e-db'

export default async function globalTeardown() {
  const caminho = resolve(__dirname, '.e2e-accounts.json')

  try {
    const conteudo = await readFile(caminho, 'utf-8').catch(() => null)
    if (!conteudo) return

    const contas = JSON.parse(conteudo) as ContasE2E
    await removerContasE2E(contas)
  } finally {
    await unlink(caminho).catch(() => undefined)
  }
}
