import { test, expect } from '@playwright/test'
import { loginComoAluno } from './auth-helpers'

test.describe('Painel do Aluno', () => {
  test('página do aluno carrega com navegação principal', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')

    await expect(page.getByTestId('aluno-view')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Treino' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Histórico' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Suporte' })).toBeVisible()
  })

  test('aba Histórico abre o histórico de treinos', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')

    await page.getByRole('link', { name: 'Histórico' }).click()
    await expect(page).toHaveURL(/\/painel\/historico$/)
    await expect(page.getByRole('heading', { name: /histórico de treinos/i })).toBeVisible()
    await expect(page.getByText(/sessões registradas/i)).toBeVisible()
  })

  test('aba Suporte oferece Personal e Sistema', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel/suporte')

    await expect(page.getByRole('heading', { name: 'Suporte', exact: true })).toBeVisible()
    await expect(page.getByText('Suporte ao Personal')).toBeVisible()
    await expect(page.getByText('Suporte ao Sistema')).toBeVisible()
    await expect(page.getByRole('button', { name: /enviar solicitação/i })).toBeVisible()
  })

  test('dark mode está ativo por padrão', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('dark')
  })

  test('toggle de tema existe no header', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    const toggle = page.getByRole('button', { name: /alternar tema|mudar para tema/i })
    await expect(toggle).toBeVisible()
  })
})
