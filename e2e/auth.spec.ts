import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('login page carrega corretamente', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /sou personal/i })).toBeChecked()
  })

  test('toggle Sou Personal / Sou Aluno', async ({ page }) => {
    await page.goto('/login')

    await page.getByRole('radio', { name: /sou aluno/i }).click()
    await expect(page.getByText(/alunos recebem acesso pelo convite/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /cadastre-se/i })).not.toBeVisible()

    await page.getByRole('radio', { name: /sou personal/i }).click()
    await expect(page.getByRole('link', { name: /cadastre-se/i })).toBeVisible()
  })

  test('cadastro mostra apenas para personal', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByText(/criar conta de personal trainer/i)).toBeVisible()
    await expect(page.getByRole('radio', { name: /sou aluno/i })).not.toBeVisible()
  })

  test('dark mode está ativo por padrão', async ({ page }) => {
    await page.goto('/login')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('dark')
  })
})
