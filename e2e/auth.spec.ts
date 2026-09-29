import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('login page carrega corretamente', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-view')).toBeVisible()
    await expect(page.getByTestId('login-email-input')).toBeVisible()
    await expect(page.getByTestId('login-password-input')).toBeVisible()
    await expect(page.getByTestId('login-submit-button')).toBeVisible()
    await expect(page.getByTestId('role-tab-personal')).toBeVisible()
    await expect(page.getByTestId('role-tab-aluno')).toBeVisible()
  })

  test('permite alternar entre Personal e Aluno', async ({ page }) => {
    await page.goto('/login')

    await page.getByTestId('role-tab-personal').click()
    await expect(page.getByTestId('role-tab-personal')).toHaveCSS('background-color', 'rgb(34, 199, 199)')

    await page.getByTestId('role-tab-aluno').click()
    await expect(page.getByTestId('role-tab-aluno')).toHaveCSS('background-color', 'rgb(34, 199, 199)')
  })

  test('cadastro público existe para Personal e Aluno', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { name: /criar conta de personal/i })).toBeVisible()

    await page.goto('/cadastro/aluno')
    await expect(page.getByRole('heading', { name: /criar conta de aluno/i })).toBeVisible()
  })

  test('recuperação de senha é pública', async ({ page }) => {
    await page.goto('/recuperar-senha')
    await expect(page.getByTestId('recovery-email-input')).toBeVisible()
  })

  test('dark mode está ativo por padrão', async ({ page }) => {
    await page.goto('/login')
    const htmlClass = await page.evaluate(() => document.documentElement.className)
    expect(htmlClass).toContain('dark')
  })
})
