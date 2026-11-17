import type { Locator, Page } from '@playwright/test'
import { createAccount, findAsset, recordTrade } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

const submit = (page: Page, name: 'Registrar compra' | 'Registrar venta') =>
  page.getByRole('main').getByRole('button', { name })

async function pickAsset(page: Page, query: string, choice: RegExp) {
  await page.getByRole('combobox', { name: 'Activo' }).fill(query)
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('option', { name: choice }).click()
}

async function fillTrade(page: Page, units: string, price: string) {
  await page.getByLabel('Unidades').fill(units)
  await page.getByLabel('Precio por unidad').fill(price)
}

/** The element ends above the sticky action row, so the keyboard or a scroll never leaves it hidden behind it. */
async function expectClearOfActionRow(page: Page, locator: Locator) {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'nearest' }))
  const box = await locator.boundingBox()
  const actions = await submit(page, 'Registrar compra').boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(actions!.y)
}

const lineCount = (locator: Locator) =>
  locator.evaluate((element) => Math.round(element.getBoundingClientRect().height / parseFloat(getComputedStyle(element).lineHeight)))

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

for (const colorScheme of ['light', 'dark'] as const) {
  test(`buy and sell lifecycle in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })

    await page.goto('/investments/positions')
    await expect(page.getByRole('heading', { name: 'Aún no tienes Posiciones' })).toBeVisible()
    await expectScreenQuality(page, `investments-positions-empty-${colorScheme}`)
    // Nothing to sell yet, and the empty state already asks for the first purchase.
    await expect(page.getByRole('link', { name: 'Registrar compra' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /^Vender/ })).toHaveCount(0)
    await page.getByRole('link', { name: 'Registrar tu primera compra' }).click()

    await expect(page).toHaveURL(/\/investments\/transactions\/buy$/)
    await expect(page.getByLabel('Fecha')).toHaveValue(panamaToday())
    // The primary action stays on screen however long the form is.
    await expect(submit(page, 'Registrar compra')).toBeInViewport()
    await pickAsset(page, 'aapl', /^AAPL/)
    await expect(page.getByRole('button', { name: 'Cambiar el Activo AAPL' })).toBeFocused()
    await fillTrade(page, '2', '100')
    await expect(page.getByText('Saldrá de la Cuenta: $200.00')).toBeVisible()
    await expectScreenQuality(page, `investments-buy-filled-${colorScheme}`)
    await expect(submit(page, 'Registrar compra')).toBeInViewport()
    await submit(page, 'Registrar compra').click()

    await expect(page).toHaveURL(/\/investments\/positions$/)
    await expect(page.getByRole('status').filter({ hasText: 'Compraste' })).toHaveText(
      'Compraste 2 unidades de AAPL por $200.00. Saldo de Bróker: $800.00.',
    )
    const row = page.getByRole('listitem').filter({ hasText: 'AAPL' })
    await expect(row).toContainText('2 unidades')
    await expect(row).toContainText('costo promedio $100.00')
    await expect(row).toContainText('$200.00')
    await expect(row).toContainText('100.00 %')
    // The two lines under the name each fit in two lines of a phone.
    for (const line of await row.locator('p').all()) expect(await lineCount(line)).toBeLessThanOrEqual(2)
    await expectScreenQuality(page, `investments-positions-${colorScheme}`)

    await page.getByRole('link', { name: 'Vender AAPL' }).click()
    await expect(page).toHaveURL(/\/investments\/transactions\/sell$/)
    await pickAsset(page, 'aapl', /^AAPL/)
    await fillTrade(page, '1', '150')
    await expect(page.getByText('Volverá a la Cuenta: $150.00')).toBeVisible()
    await expectScreenQuality(page, `investments-sell-filled-${colorScheme}`)
    await submit(page, 'Registrar venta').click()

    await expect(page.getByRole('status').filter({ hasText: 'Vendiste' })).toHaveText(
      'Vendiste 1 unidad de AAPL por $150.00. Saldo de Bróker: $950.00.',
    )
    await expect(row).toContainText('1 unidad')
    await expect(row).toContainText('costo promedio $100.00')

    await page.goto('/accounts')
    await expect(accountRow(page, 'Bróker')).toContainText('$950.00')
  })
}

test('a purchase without enough cash warns first and is accepted anyway', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '50.00' })

  await page.goto('/investments/transactions/buy')
  await pickAsset(page, 'msft', /^MSFT/)
  await fillTrade(page, '1', '80')
  const warning = page.getByText(/Esta compra supera el efectivo de Bróker \(\$50\.00\)/)
  await expect(warning).toBeVisible()
  await expectClearOfActionRow(page, warning)
  await page.getByLabel('Fecha').focus()
  await expectClearOfActionRow(page, page.getByLabel('Fecha'))
  await expectScreenQuality(page, 'investments-buy-cash-warning')
  await submit(page, 'Registrar compra').click()

  await expect(page.getByRole('status').filter({ hasText: 'Compraste' })).toContainText(
    'Saldo de Bróker: −$30.00. La compra se registró aunque la Cuenta no tenía efectivo suficiente',
  )
})

test('fractional units with eight decimals are kept', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })

  await page.goto('/investments/transactions/buy')
  await pickAsset(page, 'btc', /^BTC\/USD/)
  await fillTrade(page, '0.12345678', '40000')
  await expect(page.getByText('Saldrá de la Cuenta: $4,938.27')).toBeVisible()
  await page.getByLabel('Unidades').fill('0.123456789')
  await submit(page, 'Registrar compra').click()
  await expect(page.getByText(/ocho decimales como máximo|8 decimales como máximo/)).toBeVisible()
  await expectScreenQuality(page, 'investments-buy-ninth-decimal')
  await page.getByLabel('Unidades').fill('0.01234567')
  await expect(page.getByText(/decimales como máximo/)).toHaveCount(0)
  await submit(page, 'Registrar compra').click()

  await expect(page.getByRole('listitem').filter({ hasText: 'BTC/USD' })).toContainText('0.01234567 unidades')
})

test('selling more units than the Position holds is refused and keeps what was typed', async ({ page, expectedProblems }) => {
  // api-service refuses the sale on purpose, and the browser logs the 400.
  expectedProblems.push('status of 400')
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: account.id, asset_id: asset.id, units: '2', unit_price: '100' })

  await page.goto('/investments/transactions/sell')
  await pickAsset(page, 'aapl', /^AAPL/)
  await fillTrade(page, '3', '120')
  await submit(page, 'Registrar venta').click()

  const units = page.getByLabel('Unidades')
  await expect(page.getByText('No puedes vender 3 unidades: la Posición tiene 2.')).toBeVisible()
  await expect(units).toHaveAttribute('aria-invalid', 'true')
  // The message belongs to Unidades, not to the price beside it.
  await expect(page.locator('#sell-units-error')).toContainText('No puedes vender 3 unidades')
  await expect(page.locator('#sell-price-error')).toHaveCount(0)
  await expect(units).toBeFocused()
  await expect(units).toHaveValue('3')
  await expectScreenQuality(page, 'investments-sell-refused')
  await units.fill('2')
  await expect(page.getByText(/No puedes vender/)).toHaveCount(0)
  await submit(page, 'Registrar venta').click()
  await expect(page.getByRole('status').filter({ hasText: 'Vendiste' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aún no tienes Posiciones' })).toBeVisible()
})

test('an empty form names every field that needs a fix and each error clears as it is fixed', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })

  await page.goto('/investments/transactions/buy')
  await submit(page, 'Registrar compra').click()

  await expect(page.getByText('Busca el Activo y elígelo de la lista.')).toBeVisible()
  await expect(page.getByText(/Escribe las unidades mayores que cero/)).toBeVisible()
  await expect(page.getByText(/Escribe el precio por unidad mayor que cero/)).toBeVisible()
  await expectScreenQuality(page, 'investments-buy-errors')
  await page.getByLabel('Unidades').fill('1')
  await expect(page.getByText(/Escribe las unidades mayores que cero/)).toHaveCount(0)
  await page.getByLabel('Precio por unidad').fill('10')
  await expect(page.getByText(/Escribe el precio por unidad/)).toHaveCount(0)
  await page.getByLabel('Fecha').fill('2999-01-01')
  await submit(page, 'Registrar compra').click()
  await expect(page.getByText(/no puede ser futura/)).toBeVisible()
})

test('the search keeps markets apart, explains an empty result and never submits the operation', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })

  await page.goto('/investments/transactions/buy')
  const search = page.getByRole('combobox', { name: 'Activo' })
  await search.fill('shop')
  await search.press('Enter')
  const results = page.getByRole('listbox', { name: 'Resultados de la búsqueda' })
  await expect(results.getByRole('option')).toHaveCount(2)
  await expect(results).toContainText('XNYS')
  await expect(results).toContainText('XTSE')
  await expect(page).toHaveURL(/\/transactions\/buy$/)
  await expect(page.getByText(/Escribe las unidades mayores/)).toHaveCount(0)
  await expectScreenQuality(page, 'investments-buy-search-results')

  await search.fill('zzzz')
  await search.press('Enter')
  await expect(page.getByText(/No encontramos Activos con esa búsqueda/)).toBeVisible()
  await expectScreenQuality(page, 'investments-buy-search-empty')
})

test('a search that cannot connect says so and works again on retry', async ({ page, expectedProblems }) => {
  // The test cuts the connection on purpose.
  expectedProblems.push('net::ERR_FAILED')
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })
  let blocked = true
  await page.route('**/api/investments/assets/search*', (route) => (blocked ? route.abort() : route.continue()))

  await page.goto('/investments/transactions/buy')
  await page.getByRole('combobox', { name: 'Activo' }).fill('aapl')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page.getByText('No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.')).toBeVisible()
  await expectScreenQuality(page, 'investments-buy-search-failed')

  blocked = false
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page.getByRole('option', { name: /^AAPL/ })).toBeVisible()
  await expect(page.getByText('No pudimos conectar con Okane.')).toHaveCount(0)
})

test('the same Asset in two Accounts is one Position with a weighted average', async ({ page }) => {
  await signUp(page.request)
  const first = await createAccount(page.request, { name: 'Bróker uno', type: 'investment', opening_balance: '1000.00' })
  const second = await createAccount(page.request, { name: 'Bróker dos', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: first.id, asset_id: asset.id, units: '1', unit_price: '100' })
  await recordTrade(page.request, 'buy', { account_id: second.id, asset_id: asset.id, units: '3', unit_price: '200' })

  await page.goto('/investments/positions')

  const rows = page.getByRole('listitem').filter({ hasText: 'AAPL' })
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('4 unidades')
  await expect(rows).toContainText('costo promedio $175.00')
  await expect(rows).toContainText('En 2 Cuentas: Bróker uno 1 · Bróker dos 3')
  await expect(rows).toContainText('Precio $200.00 de tu última operación')
  await expectScreenQuality(page, 'investments-positions-grouped')
})

test('each share is a portion of the portfolio value', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const apple = await findAsset(page.request, 'aapl')
  const microsoft = await findAsset(page.request, 'msft')
  await recordTrade(page.request, 'buy', { account_id: account.id, asset_id: apple.id, units: '1', unit_price: '300' })
  await recordTrade(page.request, 'buy', { account_id: account.id, asset_id: microsoft.id, units: '1', unit_price: '100' })

  await page.goto('/investments/positions')

  await expect(page.getByRole('listitem').filter({ hasText: 'AAPL' })).toContainText('75.00 %')
  await expect(page.getByRole('listitem').filter({ hasText: 'MSFT' })).toContainText('25.00 %')
  await expectScreenQuality(page, 'investments-positions-two-assets')
  // A populated screen keeps the way to register another purchase.
  await page.getByRole('link', { name: 'Registrar compra' }).click()
  await expect(page).toHaveURL(/\/investments\/transactions\/buy$/)
})

test('without an investment Account a purchase asks for one first', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Cuenta corriente' })

  await page.goto('/investments/transactions/buy')

  await expect(page.getByRole('heading', { name: 'Necesitas una Cuenta de inversión' })).toBeVisible()
  await expectScreenQuality(page, 'investments-buy-needs-account')
  await page.getByRole('link', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(/\/accounts\/create$/)
})

test('Positions that fail to load can be retried', async ({ page, expectedProblems }) => {
  // The test cuts the connection on purpose.
  expectedProblems.push('net::ERR_FAILED')
  await signUp(page.request)
  let blocked = true
  await page.route('**/api/investments/positions*', (route) => (blocked ? route.abort() : route.continue()))

  await page.goto('/investments/positions')
  await expect(page.getByText('No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.')).toBeVisible()
  await expectScreenQuality(page, 'investments-positions-failed')

  blocked = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { name: 'Aún no tienes Posiciones' })).toBeVisible()
})

test('the controls of the purchase screen are at least 44px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Touch targets are measured on the phone project.')
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })

  await page.goto('/investments/transactions/buy')
  await page.getByRole('combobox', { name: 'Activo' }).fill('aapl')
  await page.getByRole('button', { name: 'Buscar' }).click()

  const controls = [
    page.getByRole('button', { name: 'Buscar' }),
    page.getByRole('option', { name: /^AAPL/ }),
    page.getByLabel('Unidades'),
    page.getByLabel('Precio por unidad'),
    submit(page, 'Registrar compra'),
  ]
  for (const control of controls) {
    const box = await control.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
  const account = await createAccount(page.request, { name: 'Bróker uno', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: account.id, asset_id: asset.id, units: '1', unit_price: '100' })
  await page.goto('/investments/positions')
  for (const name of ['Registrar compra', 'Vender AAPL']) {
    const box = await page.getByRole('link', { name }).boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }
})
