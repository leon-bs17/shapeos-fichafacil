import { test, expect } from '@playwright/test'
import { loginComoAluno } from './auth-helpers'

test.describe('Painel do Aluno', () => {
  test('página do aluno carrega', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await expect(page.getByRole('heading', { name: /painel do aluno/i })).toBeVisible()
  })

  test('seção ficha ativa existe', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await expect(page.getByRole('heading', { name: 'Ficha ativa' })).toBeVisible()
  })

  test('seção histórico existe', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await expect(page.getByText(/meu histórico/i)).toBeVisible()
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
