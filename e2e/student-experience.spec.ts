import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { semearContasE2E, removerContasE2E, adminRequest, obterToken, SENHA_E2E } from './e2e-db'

test('aluno treina, retoma, compara medidas e lê orientações com dados reais isolados', async ({ page }) => {
  test.setTimeout(120_000)
  const accounts = await semearContasE2E()
  const url = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const personalToken = await obterToken(accounts.personalEmail)
  const studentToken = await obterToken(accounts.alunoEmail)
  async function rest(path: string, body?: unknown, token = studentToken) {
    const response = await fetch(url + '/rest/v1/' + path, { method: body ? 'POST' : 'GET', headers: { apikey: key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body ? JSON.stringify(body) : undefined })
    expect(response.ok, await response.clone().text()).toBe(true)
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }
  try {
    const [exercise] = await rest('exercicios?select=id&limit=1', undefined, personalToken)
    const workoutId = await rest('rpc/criar_ficha_atomica', { p_aluno_id: accounts.alunoId, p_titulo: 'Treino de hoje E2E', p_itens: [{ exercicio_id: exercise.id, series: 1, repeticoes: '10', descanso_segundos: 0, ordem: 0 }] }, personalToken)
    const date = new Date(); const localDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    await rest('agenda_treino', { aluno_id: accounts.alunoId, treino_id: workoutId, data: localDate })
    await rest('avaliacoes_fisicas', [{ aluno_id: accounts.alunoId, data: '2026-01-01', peso: 75, cintura: 85 }, { aluno_id: accounts.alunoId, data: '2026-02-01', peso: 74, cintura: 83 }])
    await rest('rpc/agendar_avaliacao_shapeos', { p_aluno_id: accounts.alunoId, p_data: '2026-12-01' }, personalToken)
    await rest('rpc/publicar_comunicado_personal', { p_envio_id: randomUUID(), p_titulo: 'Orientação E2E', p_mensagem: 'Mantenha a execução controlada.', p_alunos: [accounts.alunoId] }, personalToken)
    await page.setViewportSize({ width: 1365, height: 900 })
    await page.goto('/login')
    await page.getByTestId('role-tab-aluno').click()
    await page.getByTestId('login-email-input').fill(accounts.alunoEmail)
    await page.getByTestId('login-password-input').fill(SENHA_E2E)
    await page.getByTestId('login-submit-button').click()
    await page.waitForURL('**/painel')
    const today = page.getByRole('region', { name: 'Seu treino de hoje' })
    await expect(today.getByText('Treino de hoje E2E', { exact: true })).toBeVisible()
    await expect(today.getByText(/estimativa de/).first()).toBeVisible()
    await today.getByRole('button', { name: 'Iniciar treino', exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    await page.getByLabel('Como foi o treino?').fill('Treino retomado sem perder a observação.')
    await page.getByRole('button', { name: 'Salvar e sair', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Continuar de onde parou' })).toBeVisible()
    await page.getByRole('button', { name: 'Retomar', exact: true }).click()
    await expect(page.getByLabel('Como foi o treino?')).toHaveValue('Treino retomado sem perder a observação.')
    await page.getByLabel('Carga (kg)', { exact: true }).fill('20')
    await page.getByLabel('Repetições realizadas', { exact: true }).fill('10')
    await page.getByRole('button', { name: 'Registrar série', exact: true }).click()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    await page.getByRole('button', { name: /Finalizar sessão/ }).click()
    await expect(today.getByText(/Concluído hoje/)).toBeVisible()
    await expect.poll(async () => (await rest(`sessoes_treino?aluno_id=eq.${accounts.alunoId}&select=status,observacoes`))[0]?.status).toBe('CONCLUIDO')
    await page.getByRole('button', { name: 'Evolução', exact: true }).click()
    await page.getByRole('button', { name: '7 dias', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Consistência · 7 dias', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Agenda', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Agenda semanal' })).toBeVisible()
    await expect(page.getByText('01/12/2026', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Avaliações', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Comparar medidas', exact: true })).toBeVisible()
    await expect(page.getByText('75 → 74 kg', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Avaliação inicial/ }).click()
    await expect(page.getByRole('dialog', { name: 'Avaliação inicial', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Comunicados', exact: true }).click()
    await page.getByText('Personal E2E · Orientação E2E · Não lida', { exact: true }).click()
    await expect(page.getByRole('region', { name: 'Orientações e avisos', exact: true }).getByText('Mantenha a execução controlada.', { exact: true })).toBeVisible()
    await expect.poll(async () => (await rest('personal_comunicado_leituras?select=lida_em')).length).toBe(1)
    await page.setViewportSize({ width: 390, height: 844 })
    for (const mode of ['claro', 'escuro']) {
      const toggle = page.getByRole('button', { name: `Ativar modo ${mode}`, exact: true })
      if (await toggle.count()) await toggle.click()
      for (const tab of ['Treinar', 'Evolução', 'Agenda', 'Avaliações', 'Comunicados', 'Meu Personal', 'Biblioteca de exercícios', 'Mys · Assistente', 'Minha conta', 'Meus dados', 'Ajuda e suporte']) {
        await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
        await page.getByRole('dialog', { name: 'Menu do Aluno', exact: true }).getByRole('button', { name: tab, exact: true }).click()
        await expect(page.getByRole('heading', { level: 1, name: tab, exact: true })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tab} no modo ${mode}`).toBe(true)
      }
    }
    const cleanup = await adminRequest(`/rest/v1/treinos?id=eq.${workoutId}`, { method: 'DELETE' })
    expect(cleanup.ok).toBe(true)
  } finally { await removerContasE2E(accounts) }
})
