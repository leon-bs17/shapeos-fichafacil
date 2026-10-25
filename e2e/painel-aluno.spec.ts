import { test, expect } from '@playwright/test'
import { loginComoAluno } from './auth-helpers'

test.describe('Painel do Aluno', () => {
  test('página do aluno carrega', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await expect(page.getByRole('heading', { name: /olá, aluno/i })).toBeVisible()
  })

  test('seção ficha ativa existe', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await expect(page.getByRole('heading', { name: 'Suas fichas ativas' })).toBeVisible()
  })

  test('seção histórico existe', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await page.getByRole('button', { name: 'Evolução', exact: true }).click()
    await expect(page.getByRole('heading', { name: /consistência/i })).toBeVisible()
  })

  test('alterna o tema no painel', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    await page.getByRole('button', { name: 'Ativar modo escuro', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/light/)
  })

  test('toggle de tema existe no header', async ({ page }) => {
    await loginComoAluno(page)
    await page.goto('/painel')
    const toggle = page.getByRole('button', { name: /ativar modo/i })
    await expect(toggle).toBeVisible()
  })
  test('menu do aluno adapta a navegação para celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginComoAluno(page)
    await page.goto('/painel')
    await expect(page.getByRole('heading', { name: 'Suas fichas ativas' })).toBeVisible()
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
    const menu = page.getByRole('dialog', { name: 'Menu do Aluno', exact: true })
    await expect(menu).toBeVisible()
    await expect(menu.getByText('Área do Aluno', { exact: true })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Alunos', exact: true })).toHaveCount(0)
    await menu.getByRole('button', { name: 'Agenda', exact: true }).click()
    await expect(menu).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Planejar sessões' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

})
