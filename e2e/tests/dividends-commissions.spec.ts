import type { Page } from '@playwright/test'
import { createAccount, findAsset, recordTrade } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const submit = (page: Page, name: string) => page.getByRole('main').getByRole('button', { name })

async function pickAsset(page: Page, query: string, choice: RegExp) {
  await page.getByRole('textbox', { name: 'Activo' }).fill(query)
  await page.getByRole('button', { name: 'Buscar' }).click()
  await page.getByRole('button', { name: choice }).click()
}

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`dividends and commissions in ${colorScheme}`, async ({ page, expectedProblems }) => {
    // api-service refuses a dividend of an Asset not held on purpose, and the browser logs the 400.
    expectedProblems.push(/status of 400/)
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })

    // A purchase with a commission takes both out of the cash and joins the commission to the cost.
    await page.goto('/investments/transactions/buy')
    await pickAsset(page, 'aapl', /^AAPL/)
    await page.getByLabel('Unidades').fill('2')
    await page.getByLabel('Precio por unidad').fill('100')
    await page.getByLabel('Comisión (opcional)').fill('1.50')
    await expect(page.getByText('Saldrá de la Cuenta: $201.50')).toBeVisible()
    await expectScreenQuality(page, `buy-with-commission-${colorScheme}`)
    await submit(page, 'Registrar compra').click()
    await expect(page.getByRole('status').filter({ hasText: 'Compraste' })).toHaveText(
      'Compraste 2 unidades de AAPL por $200.00. Saldo de Bróker: $798.50.',
    )
    await expect(page.getByRole('listitem').filter({ hasText: 'AAPL' })).toContainText('costo promedio $100.75')

    // A negative commission is refused in the browser, next to its field.
    await page.goto('/investments/transactions/sell')
    await pickAsset(page, 'aapl', /^AAPL/)
    await page.getByLabel('Unidades').fill('1')
    await page.getByLabel('Precio por unidad').fill('150')
    await page.getByLabel('Comisión (opcional)').fill('-1')
    await submit(page, 'Registrar venta').click()
    await expect(page.getByText('Escribe la comisión como un importe de cero o más')).toBeVisible()
    await expect(page.getByLabel('Comisión (opcional)')).toBeFocused()

    // A sale commission lowers the cash that comes back.
    await page.getByLabel('Comisión (opcional)').fill('2.25')
    await expect(page.getByText('Volverá a la Cuenta: $147.75')).toBeVisible()
    await expectScreenQuality(page, `sell-with-commission-${colorScheme}`)

    // The dividend adds cash and is reached from the list of transactions.
    await page.goto('/investments/transactions')
    await page.getByRole('link', { name: 'Registrar dividendo' }).click()
    await expect(page).toHaveURL(/\/investments\/transactions\/dividend$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Registrar dividendo' })).toBeVisible()
    await pickAsset(page, 'aapl', /^AAPL/)
    await page.getByLabel('Importe del dividendo').fill('12.40')
    await expect(page.getByText('Entrará en la Cuenta: $12.40')).toBeVisible()
    await expectScreenQuality(page, `dividend-filled-${colorScheme}`)
    await submit(page, 'Registrar dividendo').click()

    await expect(page.getByRole('status').filter({ hasText: 'dividendo' })).toHaveText(
      'Registraste el dividendo de AAPL por $12.40. Saldo de Bróker: $810.90.',
    )
    await expect(page).toHaveURL(/\/investments\/positions$/)
    await page.goto('/investments/transactions')
    // The purchase row shows the cash it took, commission included, and names the commission.
    const purchaseRow = page.getByRole('link', { name: /^AAPL .*Compra/ })
    await expect(purchaseRow).toContainText('comisión $1.50')
    await expect(purchaseRow).toContainText('$201.50')
    const dividendRow = page.getByRole('link', { name: /^AAPL .*Dividendo/ })
    await expect(dividendRow).toContainText('Dividendo · Bróker')
    await expectScreenQuality(page, `transactions-with-dividend-${colorScheme}`)

    // The cash and the Return follow: the dividend is Return, the contribution does not move.
    await page.goto('/accounts')
    await expect(accountRow(page, 'Bróker')).toContainText('$810.90')
    await page.goto('/investments/dashboard')
    await expect(page.getByText(/10\.90/).first()).toBeVisible()

    // A dividend can be corrected and deleted from its own screens.
    await page.goto('/investments/transactions')
    await dividendRow.click()
    await expect(page.getByRole('heading', { name: 'Editar dividendo' })).toBeVisible()
    await expect(page.getByLabel('Importe del dividendo')).toHaveValue('12.40')
    await page.getByLabel('Importe del dividendo').fill('15')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
      'Guardaste el dividendo de AAPL por $15.00. Saldo de Bróker: $813.50.',
    )
    await dividendRow.click()
    await page.getByRole('link', { name: 'Eliminar este dividendo' }).click()
    await expect(page.getByText('El Saldo de Bróker bajará $15.00.')).toBeVisible()
    await expectScreenQuality(page, `dividend-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar dividendo' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toHaveText(
      'Eliminaste el dividendo de AAPL por $15.00. Saldo de Bróker: $798.50.',
    )
  })
}

test('a dividend of an Asset the User does not hold is refused next to the Asset', async ({ page, expectedProblems }) => {
  expectedProblems.push(/status of 400/)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl', 'XNAS')
  await recordTrade(page.request, 'buy', { account_id: account.id, asset_id: asset.id, units: '1', unit_price: '100' })

  await page.goto('/investments/transactions/dividend')
  await pickAsset(page, 'msft', /^MSFT/)
  await page.getByLabel('Importe del dividendo').fill('5')
  await submit(page, 'Registrar dividendo').click()

  await expect(page.getByText('No tenías unidades de este Activo en esa Cuenta ese día.')).toBeVisible()
  await expectScreenQuality(page, 'dividend-refused')
})
