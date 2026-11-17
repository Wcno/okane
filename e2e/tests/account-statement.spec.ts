import type { Page } from '@playwright/test'
import { createAccount, createExpense, createIncome, createTransfer, findAsset, recordDividend, recordTrade } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const statementRow = (page: Page, name: RegExp) => page.getByRole('main').getByRole('listitem').filter({ hasText: name })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`account statement of an investment account in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const checking = await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '500.00' })
    const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
    const asset = await findAsset(page.request, 'aapl', 'XNAS')
    await createTransfer(page.request, {
      source_account_id: checking.id,
      destination_account_id: broker.id,
      amount: '200.00',
      date: '2026-02-01',
    })
    await recordTrade(page.request, 'buy', {
      account_id: broker.id,
      asset_id: asset.id,
      units: '2',
      unit_price: '100',
      commission: '1.50',
      date: '2026-03-10',
    })
    await recordTrade(page.request, 'sell', {
      account_id: broker.id,
      asset_id: asset.id,
      units: '1',
      unit_price: '150',
      date: '2026-06-10',
    })
    await recordDividend(page.request, { account_id: broker.id, asset_id: asset.id, amount: '4.20', date: '2026-07-01' })

    // From the Account to its statement.
    await page.goto('/accounts')
    await page.getByRole('link', { name: /^Bróker/ }).click()
    await page.getByRole('link', { name: 'Ver estado de cuenta' }).click()

    await expect(page).toHaveURL(new RegExp(`/accounts/${broker.id}/statement$`))
    await expect(page.getByRole('heading', { name: 'Estado de cuenta' })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('Bróker · Saldo $1,152.70')
    await expect(statementRow(page, /Dividendo de AAPL/)).toContainText('+$4.20')
    await expect(statementRow(page, /Dividendo de AAPL/)).toContainText('Saldo $1,152.70')
    await expect(statementRow(page, /Venta de AAPL/)).toContainText('+$150.00')
    await expect(statementRow(page, /Venta de AAPL/)).toContainText('Saldo $1,148.50')
    await expect(statementRow(page, /Compra de AAPL/)).toContainText('−$201.50')
    await expect(statementRow(page, /Compra de AAPL/)).toContainText('Comisión $1.50')
    await expect(statementRow(page, /Compra de AAPL/)).toContainText('Saldo $998.50')
    await expect(statementRow(page, /Transferencia de Cuenta corriente/)).toContainText('+$200.00')
    await expect(statementRow(page, /Transferencia de Cuenta corriente/)).toContainText('Saldo $1,200.00')
    // The first line is the opening Balance with its date, and it is not a link.
    const opening = statementRow(page, /Saldo inicial/)
    await expect(opening).toContainText('1 ene 2026')
    await expect(opening).toContainText('Saldo $1,000.00')
    await expect(opening.getByRole('link')).toHaveCount(0)
    await expectScreenQuality(page, `account-statement-investment-${colorScheme}`)

    // A line leads to the screen that edits its movement.
    await page.getByRole('link', { name: /^Compra de AAPL.*Editar transacción$/ }).click()
    await expect(page).toHaveURL(/\/investments\/transactions\/\d+\/edit$/)
  })

  test(`account statement of a spending account in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const checking = await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
    const savings = await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '0.00' })
    await createIncome(page.request, { account_id: checking.id, amount: '500.00', date: '2026-02-02', description: 'Quincena' })
    await createExpense(page.request, { account_id: checking.id, amount: '120.10', date: '2026-02-03', description: 'Supermercado' })
    await createTransfer(page.request, {
      source_account_id: checking.id,
      destination_account_id: savings.id,
      amount: '300.00',
      date: '2026-02-04',
    })

    await page.goto(`/accounts/${checking.id}/statement`)

    await expect(page.getByRole('main')).toContainText('Cuenta corriente · Saldo $1,079.90')
    await expect(statementRow(page, /Transferencia a Ahorro/)).toContainText('−$300.00')
    await expect(statementRow(page, /Transferencia a Ahorro/)).toContainText('Saldo $1,079.90')
    await expect(statementRow(page, /Supermercado/)).toContainText('−$120.10')
    await expect(statementRow(page, /Supermercado/)).toContainText('Saldo $1,379.90')
    await expect(statementRow(page, /Quincena/)).toContainText('+$500.00')
    await expect(statementRow(page, /Quincena/)).toContainText('Saldo $1,500.00')
    await expect(page.getByRole('status').filter({ hasText: 'Mostrando' })).toHaveText('Mostrando 4 de 4 líneas.')
    // Oldest first: the opening Balance tops the Statement and the latest movement ends it.
    await expect(page.getByRole('main').getByRole('listitem').first()).toContainText('Saldo inicial')
    await expect(page.getByRole('main').getByRole('listitem').last()).toContainText('Transferencia a Ahorro')
    await expectScreenQuality(page, `account-statement-spending-${colorScheme}`)

    await page.getByRole('link', { name: /^Supermercado.*Editar gasto$/ }).click()
    await expect(page).toHaveURL(/\/expenses\/\d+\/edit$/)
  })
}

test('account statement of an account that is not the Users', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await page.goto('/accounts/999999/statement')

  await expect(page.getByRole('heading', { name: 'No encontramos esta Cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'account-statement-not-found')
})
