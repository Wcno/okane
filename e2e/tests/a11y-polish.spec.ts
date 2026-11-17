import type { Page } from '@playwright/test'
import {
  createAccount,
  findAsset,
  recordTrade,
} from './support/ledger.js'
import { expect, test } from './support/qa.js'
import { signUp } from './support/session.js'

const onDesktop = (testInfo: { project: { name: string } }) => testInfo.project.name === 'desktop'

async function openBuyForm(page: Page) {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })
  await page.goto('/investments/transactions/buy')
}

test('the Asset picker is a combobox: it searches while typing and walks its options with the keys', async ({ page }) => {
  await openBuyForm(page)
  const combobox = page.getByRole('combobox', { name: 'Activo' })
  const listbox = page.getByRole('listbox', { name: 'Resultados de la búsqueda' })
  await expect(combobox).toHaveAttribute('aria-expanded', 'false')

  // No Enter and no button: the pause after typing is enough.
  await combobox.fill('shop')
  await expect(listbox.getByRole('option')).toHaveCount(2)
  await expect(page.getByText('2 resultados')).toBeVisible()
  await expect(combobox).toHaveAttribute('aria-expanded', 'true')
  await expect(combobox).toHaveAttribute('aria-controls', (await listbox.getAttribute('id'))!)

  await combobox.press('ArrowDown')
  const first = listbox.getByRole('option').first()
  await expect(first).toHaveAttribute('aria-selected', 'true')
  await expect(combobox).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!)
  await combobox.press('ArrowDown')
  await expect(listbox.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true')
  await combobox.press('ArrowUp')
  await expect(first).toHaveAttribute('aria-selected', 'true')

  await combobox.press('Escape')
  await expect(combobox).toHaveAttribute('aria-expanded', 'false')
  await expect(combobox).toBeFocused()

  await combobox.press('ArrowDown')
  await expect(combobox).toHaveAttribute('aria-expanded', 'true')
  await combobox.press('Enter')
  await expect(page.getByRole('button', { name: /^Cambiar el Activo/ })).toBeVisible()
  await expect(page).toHaveURL(/\/transactions\/buy$/)
})

test('a Position is sold with its Asset and Account already chosen', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker uno', type: 'investment', opening_balance: '1000.00' })
  const second = await createAccount(page.request, { name: 'Bróker dos', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: second.id, asset_id: asset.id, units: '2', unit_price: '100' })

  await page.goto('/investments/positions')
  const sell = page.getByRole('link', { name: 'Vender AAPL' })
  const fix = page.getByRole('link', { name: 'Corregir precio de AAPL' })
  const [sellBox, fixBox] = [await sell.boundingBox(), await fix.boundingBox()]
  // Side by side or wrapped, the two targets never touch.
  const apartAcross = fixBox!.x - (sellBox!.x + sellBox!.width)
  const apartDown = fixBox!.y - (sellBox!.y + sellBox!.height)
  expect(Math.max(apartAcross, apartDown)).toBeGreaterThanOrEqual(7)

  await sell.click()
  await expect(page).toHaveURL(/\/transactions\/sell$/)
  await expect(page.getByRole('button', { name: 'Cambiar el Activo AAPL' })).toBeVisible()
  await expect(page.getByLabel('Cuenta de inversión')).toHaveValue(String(second.id))
})

test('every screen names the tab, and a header action has one clean accessible name', async ({ page }) => {
  await signUp(page.request)
  const names: Record<string, string> = {
    '/movements': 'Movimientos · Okane',
    '/categories': 'Categorías · Okane',
    '/settings/integrations': 'Integraciones · Okane',
    '/profile/change-password': 'Cambiar contraseña · Okane',
  }
  for (const [path, title] of Object.entries(names)) {
    await page.goto(path)
    await expect(page).toHaveTitle(title)
  }

  await page.goto('/categories')
  const create = page.getByRole('link', { name: 'Nueva Categoría', exact: true })
  await expect(create).toHaveAttribute('aria-label', 'Nueva Categoría')
})

test('the sidebar marks only Integraciones on its screen, and its back link leaves for Preferencias', async ({ page }, testInfo) => {
  test.skip(!onDesktop(testInfo), 'The sidebar and the back link to Preferencias belong to the wide layout.')
  await signUp(page.request)
  await page.goto('/settings/integrations')

  const sidebar = page.getByRole('complementary')
  await expect(sidebar.getByRole('link', { name: 'Integraciones' })).toHaveAttribute('aria-current', 'page')
  await expect(sidebar.getByRole('link', { name: 'Preferencias' })).not.toHaveAttribute('aria-current', 'page')

  await page.getByRole('main').getByRole('link', { name: 'Preferencias' }).click()
  await expect(page).toHaveURL(/\/settings$/)
})

test('clearing the filters moves the keyboard to the first filter', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/movements?type=expense')
  await page.getByRole('button', { name: 'Quitar filtros' }).click()
  await expect(page.getByRole('combobox', { name: 'Tipo' })).toBeFocused()
})

test('the keyboard continues at the list of tokens after saving the secret and after revoking', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/settings/integrations')
  await page.getByLabel('Nombre').fill('Hoja de gastos')
  await page.getByRole('checkbox', { name: /Leer/ }).first().check()
  await page.getByRole('button', { name: 'Crear token' }).click()
  await page.getByRole('button', { name: 'Ya lo guardé' }).click()
  await expect(page.getByRole('heading', { name: 'Tus tokens' })).toBeFocused()

  await page.getByRole('button', { name: 'Revocar token Hoja de gastos' }).click()
  await page.getByRole('button', { name: 'Sí, revocar Hoja de gastos' }).click()
  await expect(page.getByText(/Revocado el/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tus tokens' })).toBeFocused()
})

test('the quick sheet does not move when the Restante hint appears', async ({ page }, testInfo) => {
  test.skip(!onDesktop(testInfo), 'The sheet is a dialog near the top only on the wide layout.')
  await signUp(page.request)
  await createAccount(page.request, { name: 'Cuenta corriente' })
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Registrar gasto' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Registrar gasto' })).toBeVisible()
  // The sheet slides in for 220ms; measure once it has settled.
  await page.waitForTimeout(400)
  const before = await dialog.boundingBox()

  await dialog.getByLabel('Monto').fill('12')
  await dialog.getByText('Alimentación', { exact: true }).click()
  await expect(dialog.getByText(/no tiene Presupuesto este mes/).first()).toBeVisible()
  const after = await dialog.boundingBox()
  expect(after!.y).toBe(before!.y)
  expect(after!.height).toBe(before!.height)
})
