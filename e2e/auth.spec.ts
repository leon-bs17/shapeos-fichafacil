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
    await expect(page.getByTestId('role-tab-personal')).toHaveAttribute('aria-pressed', 'true')

    await page.getByTestId('role-tab-aluno').click()
    await expect(page.getByTestId('role-tab-aluno')).toHaveAttribute('aria-pressed', 'true')
  })

  test('cadastro de personal oferece acesso ao cadastro de aluno', async ({ page }) => {
    await page.goto('/cadastro')
    await expect(page.getByRole('heading', { name: /criar conta de personal/i })).toBeVisible()
    await page.getByRole('link', { name: 'Sou Aluno', exact: true }).click()
    await expect(page.getByRole('heading', { name: /criar conta de aluno/i })).toBeVisible()
  })

  test('recuperação de senha é pública e valida o e-mail sem enviar pedido inválido', async ({ page }) => {
    await page.goto('/recuperar-senha')
    let recoveryRequests = 0
    page.on('request', request => { if (new URL(request.url()).pathname === '/auth/v1/recover') recoveryRequests++ })
    const email = page.getByTestId('recovery-email-input')
    await expect(email).toBeVisible()
    await page.getByTestId('recovery-send-button').click()
    await expect(page.getByRole('alert')).toHaveText('Informe seu e-mail.')
    await expect(email).toBeFocused()
    await email.fill('email-invalido')
    await page.getByTestId('recovery-send-button').click()
    await expect(page.getByRole('alert')).toHaveText('Informe um e-mail válido, como nome@exemplo.com.')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(recoveryRequests).toBe(0)
  })

  test('alterna entre os modos e preserva a preferência', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Ativar modo escuro', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Ativar modo claro', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/light/)
  })
})
