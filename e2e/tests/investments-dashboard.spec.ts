import type { Page } from '@playwright/test'
import { createAccount, createTransfer, findAsset, recordTrade, setReferencePrice } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const main = (page: Page) => page.getByRole('main')

/** Opens the price screen of an Asset from the Positions list and saves a price for today. */
async function setPrice(page: Page, symbol: string, value: string) {
  await page.goto('/investments/positions')
  await page.getByRole('link', { name: `Corregir precio de ${symbol}` }).click()
  await page.getByLabel('Precio por unidad').fill(value)
  await main(page).getByRole('button', { name: 'Guardar precio' }).click()
  await expect(page.getByRole('status').filter({ hasText: `Precio de ${symbol} guardado` })).toBeVisible()
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`dashboard and performance show a gain, then a loss, in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)

    await page.goto('/investments/dashboard')
    await expect(page.getByRole('heading', { name: 'Aún no tienes una Cuenta de inversión' })).toBeVisible()
    await expectScreenQuality(page, `investments-dashboard-empty-${colorScheme}`)

    const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
    const asset = await findAsset(page.request, 'aapl')
    await recordTrade(page.request, 'buy', { account_id: broker.id, asset_id: asset.id, units: '10', unit_price: '50' })

    await page.goto('/investments/dashboard')
    await expect(page.getByRole('heading', { name: 'Inversiones' })).toBeVisible()
    const value = page.getByRole('region', { name: 'Valor del portafolio' })
    await expect(value).toContainText('$1,000.00')
    await expect(value).toContainText('Aporte neto')
    await expect(value).toContainText('Algunos precios son estimados')
    const shares = page.getByRole('region', { name: 'Distribución por Activo' })
    await expect(shares).toContainText('AAPL')
    await expect(shares).toContainText('$500.00')
    await expect(shares).toContainText('100.00 %')
    await expect(shares).toContainText('de tu última operación')
    await expect(shares).toContainText('(estimado)')

    // The create action sits at the top right and is 44px tall on a phone.
    const action = main(page).getByRole('link', { name: 'Registrar compra' })
    const box = (await action.boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.height).toBeGreaterThanOrEqual(37.5)
    if (viewport.width < 640) expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.y).toBeLessThan(160)
    // On a desktop the shell's own Registrar gasto button owns the corner; on a phone this one does.
    if (viewport.width < 640) expect(viewport.width - (box.x + box.width)).toBeLessThan(48)
    await expectScreenQuality(page, `investments-dashboard-estimated-${colorScheme}`)

    // A manual price turns the estimate into the User's own price, and a gain shows.
    await setPrice(page, 'AAPL', '62.5')
    const row = page.getByRole('listitem').filter({ hasText: 'AAPL' })
    await expect(row).toContainText('fijado por ti')
    await page.goto('/investments/dashboard')
    await expect(value).toContainText('$1,125.00')
    await expect(value).toContainText('+$125.00')
    await expect(value).toContainText('(+12.50 %)')
    await expect(value).not.toContainText('Algunos precios son estimados')
    await expect(shares).toContainText('fijado por ti')
    await expect(shares).not.toContainText('(estimado)')
    await expectScreenQuality(page, `investments-dashboard-gain-${colorScheme}`)

    await value.getByRole('link', { name: 'Rendimiento' }).click()
    await expect(page).toHaveURL(/\/investments\/performance$/)
    const total = page.getByRole('region', { name: 'Rendimiento acumulado' })
    await expect(total).toContainText('$125.00')
    await expect(total).toContainText('Valor actual')
    await expect(total).toContainText('$1,125.00')
    await expect(total).toContainText('Aporte neto')
    await expect(total).toContainText('$1,000.00')
    await expect(page.getByRole('region', { name: 'Por Posición' })).toContainText('$625.00')
    await expect(page.getByRole('region', { name: 'Por Posición' })).toContainText('+$125.00 (+25.00 %)')
    await expectScreenQuality(page, `investments-performance-gain-${colorScheme}`)

    // A loss: the same day's correction replaces the price.
    await setPrice(page, 'AAPL', '40')
    await page.goto('/investments/performance')
    await expect(total).toContainText('−$100.00')
    await expect(total).toContainText('(−10.00 %)')
    await expect(total).toContainText('Pérdida')
    await expectScreenQuality(page, `investments-performance-loss-${colorScheme}`)
  })
}

test('a transfer in and a withdrawal change the Net Contribution, not the Return', async ({ page }) => {
  await signUp(page.request)
  const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const spending = await createAccount(page.request, { name: 'Corriente', opening_balance: '800.00' })
  await createTransfer(page.request, { source_account_id: spending.id, destination_account_id: broker.id, amount: '300.00' })
  await createTransfer(page.request, { source_account_id: broker.id, destination_account_id: spending.id, amount: '100.00' })

  await page.goto('/investments/dashboard')

  const value = page.getByRole('region', { name: 'Valor del portafolio' })
  await expect(value).toContainText('$1,200.00')
  await expect(value.getByText('Aporte neto', { exact: true })).toBeVisible()
  await expect(value.locator('dd', { hasText: '$1,200.00' }).first()).toBeVisible()
  await expect(value).toContainText('(0.00 %)')
})

test('the Return of a period is the difference between two cumulative Returns', async ({ page }) => {
  await signUp(page.request)
  const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '100.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: broker.id, asset_id: asset.id, units: '1', unit_price: '100', date: '2026-01-02' })
  await setReferencePrice(page.request, asset.id, '110', '2026-02-05')
  await setReferencePrice(page.request, asset.id, '115', '2026-02-10')

  await page.goto('/investments/performance')

  const period = page.getByRole('region', { name: 'Rendimiento del período' })
  await period.getByLabel('Desde').fill('2026-02-06')
  await expect(period).toContainText('+$5.00')
  await expect(period).toContainText('Acumulado al inicio')
  await expect(period.locator('dd', { hasText: '$10.00' })).toBeVisible()
  await expect(period.locator('dd', { hasText: '$15.00' })).toBeVisible()
  await expectScreenQuality(page, 'investments-performance-period')
  await expect(main(page).getByRole('link', { name: 'Registrar compra' })).toHaveCount(0)
})

test('the percent does not apply without a positive Net Contribution', async ({ page }) => {
  await signUp(page.request)
  const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '0.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: broker.id, asset_id: asset.id, units: '1', unit_price: '100' })

  await page.goto('/investments/performance')

  const total = page.getByRole('region', { name: 'Rendimiento acumulado' })
  await expect(total).toContainText('No aplica')
  await expect(total).toContainText('El porcentaje no aplica')
  await expectScreenQuality(page, 'investments-performance-no-percent')
})

test('a price must be positive with eight decimals at most', async ({ page }) => {
  await signUp(page.request)
  const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: broker.id, asset_id: asset.id, units: '1', unit_price: '100' })

  await page.goto(`/investments/assets/${asset.id}/price`)
  await expect(page.getByRole('heading', { name: 'Corregir precio' })).toBeVisible()
  await expect(page.getByText('Precio $100.00 de tu última operación')).toBeVisible()
  await expectScreenQuality(page, 'investments-price-form')
  await main(page).getByRole('button', { name: 'Guardar precio' }).click()
  await expect(page.getByText(/Escribe el precio mayor que cero/)).toBeVisible()
  await expectScreenQuality(page, 'investments-price-invalid')
  await page.getByLabel('Precio por unidad').fill('0.123456789')
  await main(page).getByRole('button', { name: 'Guardar precio' }).click()
  await expect(page.getByText(/8 decimales como máximo/)).toBeVisible()
})

test('an unknown Asset is not found', async ({ page, expectedProblems }) => {
  // api-service answers 404 on purpose, and the browser logs it.
  expectedProblems.push('status of 404')
  await signUp(page.request)

  await page.goto('/investments/assets/999999/price')

  await expect(page.getByText('Este Activo ya no existe')).toBeVisible()
  await expectScreenQuality(page, 'investments-price-gone')
})
