import { test, expect } from '@playwright/test'
import { loginComoPersonal } from './auth-helpers'

test.describe('Biblioteca de Exercícios', () => {
  test('página carrega com lista de exercícios', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/exercicios')
    await expect(page.getByRole('heading', { name: /biblioteca/i })).toBeVisible()
  })

  test('campo de busca existe', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/exercicios')
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible()
  })

  test('exercícios do seed estão presentes', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/exercicios')
    await expect(page.getByText(/supino reto/i)).toBeVisible()
    await expect(page.getByText(/agachamento livre/i)).toBeVisible()
  })

  test('busca filtra exercícios', async ({ page }) => {
    await loginComoPersonal(page)
    await page.goto('/exercicios')
    await page.getByPlaceholder(/buscar/i).fill('supino')
    await expect(page.getByText(/supino reto/i)).toBeVisible()
    await expect(page.getByText(/supino inclinado/i)).toBeVisible()
    await expect(page.getByText(/agachamento livre/i)).not.toBeVisible()
  })
})
