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
      await expect(page.getByRole('link', { name: 'Editar cuenta Tarjeta prueba' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.getByRole('link', { name: 'Editar cuenta Tarjeta prueba' }).click()
      await expect(page.getByLabel('Saldo inicial', { exact: true })).toHaveCount(0)
      await page.getByLabel('Nombre', { exact: true }).fill('Tarjeta corregida')
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(page).toHaveURL(/\/accounts$/)
      await page.reload()
      await page.getByRole('link', { name: 'Editar cuenta Tarjeta corregida' }).click()
      await page.getByRole('link', { name: 'Eliminar esta cuenta' }).click()
      await page.getByRole('button', { name: 'Eliminar cuenta', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Aún no tienes Cuentas' })).toBeVisible()
    })
  }
}

test('an Account form clears a field\'s error as soon as that field changes', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/accounts/create')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  const name = page.getByLabel('Nombre', { exact: true })
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Escribe el nombre de la Cuenta')).toBeVisible()
  await expect(page.getByText('Elige el tipo de Cuenta')).toBeVisible()

  await name.fill('Cuenta')

  await expect(name).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByText('Escribe el nombre de la Cuenta')).toHaveCount(0)
  await expect(page.getByText('Elige el tipo de Cuenta')).toBeVisible()
})

test('an opening balance past twelve digits says it is too large', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/accounts/create')
  await page.getByLabel('Nombre', { exact: true }).fill('Cuenta')
  await page.locator('input[value=spending]').check()
  await page.getByLabel('Saldo inicial', { exact: true }).fill('1000000000000')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()

  await expect(page.getByText('El Saldo inicial es demasiado grande.')).toBeVisible()
})

test('the empty states of Gastos and Cuentas have the same width', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signUp(page.request)
  const widthOf = async (path: string, title: string) => {
    await page.goto(path)
    const card = page.locator('section').filter({ has: page.getByRole('heading', { name: title }) })
    return (await card.boundingBox())?.width
  }

  const accounts = await widthOf('/accounts', 'Aún no tienes Cuentas')
  const expenses = await widthOf('/expenses', 'Aún no registras gastos')

  expect(accounts).toBeGreaterThan(0)
  expect(accounts).toBe(expenses)
})


