import { expect, test } from '@playwright/test'
import { signUp } from './support/session.js'

for (const width of [390, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`accounts lifecycle at ${width}px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme })
      await signUp(page.request)
      await page.goto('/accounts/create')
      await page.getByLabel('Nombre', { exact: true }).fill('Tarjeta prueba')
      await page.locator('input[value=spending]').check()
      await page.getByLabel('Saldo inicial', { exact: true }).fill('-312.45')
      await page.getByLabel('Fecha de inicio del registro').fill('2026-01-01')
      await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Tarjeta prueba' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.getByRole('link', { name: 'Editar Tarjeta prueba' }).click()
      await expect(page.getByLabel('Saldo inicial', { exact: true })).toHaveCount(0)
      await page.getByLabel('Nombre', { exact: true }).fill('Tarjeta corregida')
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(page).toHaveURL(/\/accounts$/)
      await page.reload()
      await page.getByRole('link', { name: 'Eliminar Tarjeta corregida' }).click()
      await page.getByRole('button', { name: 'Eliminar cuenta', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Aún no tienes Cuentas' })).toBeVisible()
    })
  }
}


