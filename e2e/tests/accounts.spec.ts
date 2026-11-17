import { expect, expectScreenQuality, knownAxeRules, test } from './support/qa.js'
import { signUp } from './support/session.js'

for (const colorScheme of ['light', 'dark'] as const) {
  test(`accounts lifecycle in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)

    await page.goto('/accounts')
    await expect(page.getByRole('heading', { name: 'Aún no tienes Cuentas' })).toBeVisible()
    await expectScreenQuality(page, `accounts-empty-${colorScheme}`)

    await page.goto('/accounts/create')
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible()
    await expectScreenQuality(page, `accounts-create-errors-${colorScheme}`)

    await page.getByLabel('Nombre', { exact: true }).fill('Tarjeta prueba')
    await page.locator('input[value=spending]').check()
    await page.getByLabel('Saldo inicial', { exact: true }).fill('-312.45')
    await page.getByLabel('Fecha de inicio del registro').fill('2026-01-01')
    await expectScreenQuality(page, `accounts-create-filled-${colorScheme}`)
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Tarjeta prueba' })).toBeVisible()
    await expectScreenQuality(page, `accounts-list-${colorScheme}`, { skipAxeRules: knownAxeRules.balanceFigureLabel })

    await page.getByRole('link', { name: 'Editar Tarjeta prueba' }).click()
    await expect(page.getByLabel('Saldo inicial', { exact: true })).toHaveCount(0)
    await expectScreenQuality(page, `accounts-edit-${colorScheme}`)
    await page.getByLabel('Nombre', { exact: true }).fill('Tarjeta corregida')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page).toHaveURL(/\/accounts$/)
    await page.reload()

    await page.getByRole('link', { name: 'Eliminar Tarjeta corregida' }).click()
    await expect(page.getByRole('heading', { name: 'Eliminar cuenta' })).toBeVisible()
    await expectScreenQuality(page, `accounts-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar cuenta', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Aún no tienes Cuentas' })).toBeVisible()
  })
}
