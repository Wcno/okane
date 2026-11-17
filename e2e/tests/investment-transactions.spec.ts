import type { Page } from '@playwright/test'
import { createAccount, findAsset, recordTrade } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

/** The rows of the list: each one is a link to the screen that corrects that purchase or sale. */
const purchaseRow = (page: Page) => page.getByRole('link', { name: /^AAPL .*Compra · / })
const saleRow = (page: Page) => page.getByRole('link', { name: /^AAPL .*Venta · / })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`investment transactions lifecycle in ${colorScheme}`, async ({ page, expectedProblems }) => {
    // api-service refuses the correction and the deletion on purpose, and the browser logs each 400.
    expectedProblems.push(/status of 400/)
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const account = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
    const asset = await findAsset(page.request, 'aapl', 'XNAS')

    await page.goto('/investments/transactions')
    await expect(page.getByRole('heading', { name: 'Aún no registras compras ni ventas' })).toBeVisible()
    await expectScreenQuality(page, `investment-transactions-empty-${colorScheme}`)

    await recordTrade(page.request, 'buy', {
      account_id: account.id,
      asset_id: asset.id,
      units: '2',
      unit_price: '100',
      date: '2026-03-10',
    })
    await recordTrade(page.request, 'sell', {
      account_id: account.id,
      asset_id: asset.id,
      units: '1',
      unit_price: '150',
      date: '2026-06-10',
    })

    await page.goto('/investments/transactions')
    await expect(page.getByText('Mostrando 2 de 2 transacciones de inversión.')).toBeVisible()
    await expect(saleRow(page)).toContainText('Venta · 1 unidad a $150.00 · Bróker')
    await expect(purchaseRow(page)).toContainText('Compra · 2 unidades a $100.00 · Bróker')
    await expectScreenQuality(page, `investment-transactions-list-${colorScheme}`)

    // Correcting the purchase to 0.5 units would leave the June sale without units: refused, and the typed value stays.
    await purchaseRow(page).click()
    await expect(page.getByRole('heading', { name: 'Editar compra' })).toBeVisible()
    await expect(page.getByLabel('Unidades')).toHaveValue('2')
    await expectScreenQuality(page, `investment-transaction-edit-${colorScheme}`)

    await page.getByLabel('Unidades').fill('0.5')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(
      page.getByText(
        'No puedes guardar este cambio: la venta del 10 jun 2026 vende 1 unidad y ese día solo tendrías 0.5 unidades.',
      ),
    ).toBeVisible()
    await expect(page.getByLabel('Unidades')).toBeFocused()
    await expect(page.getByLabel('Unidades')).toHaveValue('0.5')
    await expectScreenQuality(page, `investment-transaction-edit-refused-${colorScheme}`)

    await page.getByLabel('Unidades').fill('3')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
      'Guardaste la compra de 3 unidades de AAPL por $300.00. Saldo de Bróker: $850.00.',
    )

    // Deleting the purchase would leave the sale without units: refused on the delete screen.
    await purchaseRow(page).click()
    await page.getByRole('link', { name: 'Eliminar esta compra' }).click()
    await expect(page).toHaveURL(/\/investments\/transactions\/\d+\/delete$/)
    await page.getByRole('button', { name: 'Eliminar compra' }).click()
    await expect(
      page.getByText(
        'No puedes eliminar esta compra: la venta del 10 jun 2026 vende 1 unidad y ese día solo tendrías 0 unidades.',
      ),
    ).toBeVisible()
    await expectScreenQuality(page, `investment-transaction-delete-refused-${colorScheme}`)

    // Deleting the sale gives back its cash and the Balance follows.
    await page.getByRole('link', { name: 'Cancelar' }).click()
    await saleRow(page).click()
    await page.getByRole('link', { name: 'Eliminar esta venta' }).click()
    await expect(page.getByText('El Saldo de Bróker bajará $150.00.')).toBeVisible()
    await expectScreenQuality(page, `investment-transaction-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar venta' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toHaveText(
      'Eliminaste la venta de 1 unidad de AAPL por $150.00. Saldo de Bróker: $700.00.',
    )
    await expect(page.getByText('Mostrando 1 de 1 transacciones de inversión.')).toBeVisible()

    await page.goto('/accounts')
    await expect(accountRow(page, 'Bróker')).toContainText('$700.00')
  })
}

test('the positions screen leads to the transactions', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })

  await page.goto('/investments/positions')
  await page.getByRole('link', { name: 'Ver transacciones' }).click()

  await expect(page).toHaveURL(/\/investments\/transactions$/)
  await expect(page.getByRole('heading', { name: 'Transacciones de inversión' })).toBeVisible()
})

test('the populated list opens the purchase screen from its header, and its title fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl', 'XNAS')
  await recordTrade(page.request, 'buy', {
    account_id: account.id,
    asset_id: asset.id,
    units: '1',
    unit_price: '100',
    date: '2026-03-10',
  })

  await page.goto('/investments/transactions')
  await expect(page.getByText('Mostrando 1 de 1 transacciones de inversión.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Registrar venta' })).toHaveCount(0)

  const title = page.getByRole('heading', { level: 1, name: 'Transacciones de inversión' })
  await expect(title).toBeVisible()
  expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(await noOverflow(page)).toBe(true)

  await page.getByRole('link', { name: 'Comprar' }).click()
  await expect(page).toHaveURL(/\/investments\/transactions\/buy$/)
  await expect(page.getByRole('heading', { name: 'Registrar compra' })).toBeVisible()
})

test('a transaction that is not the User’s is not here', async ({ page, expectedProblems }) => {
  // api-service answers 404 on purpose, and the browser logs it.
  expectedProblems.push(/status of 404/)
  await signUp(page.request)

  await page.goto('/investments/transactions/999999/edit')

  await expect(page.getByRole('heading', { name: 'No encontramos esta Transacción de inversión' })).toBeVisible()
  await expectScreenQuality(page, 'investment-transaction-not-here')
})

test('the list shows the next page on request and keeps the day headings', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '5000.00' })
  const asset = await findAsset(page.request, 'aapl', 'XNAS')
  for (let index = 0; index < 51; index += 1) {
    await recordTrade(page.request, 'buy', {
      account_id: account.id,
      asset_id: asset.id,
      units: '1',
      unit_price: '1',
      date: index < 3 ? '2026-11-10' : undefined,
    })
  }

  await page.goto('/investments/transactions')
  await expect(page.getByText('Mostrando 50 de 51 transacciones de inversión.')).toBeVisible()
  const more = page.getByRole('button', { name: 'Mostrar más' })
  await more.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Mostrando 51 de 51 transacciones de inversión.')).toBeVisible()
  // The button is gone: the keyboard moves to the first row that arrived instead of falling to the page.
  await expect(page.locator('a[id^=transaction-]').nth(50)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Mostrar más' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'mar 10 nov' })).toBeVisible()
  await expectScreenQuality(page, 'investment-transactions-all-pages')
  expect(await noOverflow(page)).toBe(true)
})
