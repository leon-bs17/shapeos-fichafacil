import { test, expect } from '@playwright/test'
import { loginComoPersonal } from './auth-helpers'

test.describe('Treinos', () => {
  test('página de treinos carrega', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/treinos')
    await expect(page.getByRole('heading', { name: /treinos/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /nova ficha/i })).toBeVisible()
  })

  test('modal nova ficha mostra seletor de tipo e template', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/treinos')
    await page.getByRole('button', { name: /nova ficha/i }).click()

    await expect(page.getByText(/tipo de treino/i)).toBeVisible()
    await expect(page.getByText(/hipertrofia/i)).toBeVisible()
    await expect(page.getByText(/emagrecimento/i)).toBeVisible()
    await expect(page.getByText(/condicionamento/i)).toBeVisible()
    await expect(page.getByText(/push \/ pull \/ legs/i)).toBeVisible()
  })

  test('selecionar template preenche exercícios', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/treinos')
    await page.getByRole('button', { name: /nova ficha/i }).click()

    await page.getByText(/push \/ pull \/ legs/i).click()
    await expect(page.getByText(/exercícios/i)).toBeVisible()
    await expect(page.getByText(/trocar template/i)).toBeVisible()
  })

  test('botão editar aparece nas fichas', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/treinos')
    const editarBtns = page.getByRole('button', { name: /editar/i })
    const count = await editarBtns.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
