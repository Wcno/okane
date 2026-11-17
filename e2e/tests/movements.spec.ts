import type { Page } from '@playwright/test'
import {
  createAccount,
  createExpense,
  createIncome,
  createTransfer,
  findAsset,
  recordTrade,
} from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const rows = (page: Page) => page.getByRole('main').getByRole('listitem')
/** The visible ways to register an Expense: the shell offers it everywhere, so a screen must not add another. */
const registerExpense = (page: Page) =>
  page
    .getByRole('link', { name: 'Registrar gasto', exact: true })
    .or(page.getByRole('button', { name: 'Registrar gasto', exact: true }))

const row = (page: Page, title: string, action: string) =>
  page.getByRole('link', { name: new RegExp(`^${title}.*\\. ${action}$`) })

async function seed(page: Page) {
  const checking = await createAccount(page.request, { name: 'Corriente', opening_balance: '1000.00' })
  const savings = await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '300.00' })
  const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
  const asset = await findAsset(page.request, 'aapl')

  const expense = await createExpense(page.request, {
    account_id: checking.id,
    amount: '12.50',
    date: '2026-11-10',
    description: 'Supermercado',
  })
  await createIncome(page.request, { account_id: checking.id, amount: '500.00', date: '2026-11-05', description: 'Salario' })
  await createTransfer(page.request, {
    source_account_id: checking.id,
    destination_account_id: savings.id,
    amount: '100.00',
    date: '2026-11-08',
    description: 'Ahorro de noviembre',
  })
  await recordTrade(page.request, 'buy', {
    account_id: broker.id,
    asset_id: asset.id,
    units: '2',
    unit_price: '100',
    date: '2026-11-02',
  })
  await recordTrade(page.request, 'sell', {
    account_id: broker.id,
    asset_id: asset.id,
    units: '1',
    unit_price: '110',
    date: '2026-11-03',
  })
  await recordTrade(page.request, 'dividend', { account_id: broker.id, asset_id: asset.id, amount: '3.25', date: '2026-11-04' })
  return { expense }
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`movements view in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)

    await page.goto('/movements')
    await expect(page.getByRole('heading', { level: 1, name: 'Movimientos' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Aún no registras movimientos' })).toBeVisible()
    await expectScreenQuality(page, `movements-empty-${colorScheme}`)

    const { expense } = await seed(page)
    await page.goto('/movements')

    // The six kinds, each named by its type, newest day first.
    await expect(rows(page)).toHaveCount(6)
    await expect(page.getByRole('status').filter({ hasText: 'Mostrando' })).toHaveText('Mostrando 6 de 6 movimientos.')
    await expect(row(page, 'Supermercado', 'Editar gasto')).toContainText('Gasto')
    await expect(row(page, 'Salario', 'Editar ingreso')).toContainText('Ingreso')
    await expect(row(page, 'Ahorro de noviembre', 'Editar transferencia')).toContainText('Transferencia')
    await expect(row(page, 'AAPL', 'Editar compra')).toContainText('Compra')
    await expect(row(page, 'AAPL', 'Editar venta')).toContainText('Venta')
    await expect(row(page, 'AAPL', 'Editar dividendo')).toContainText('Dividendo')
    await expect(page.getByRole('link', { name: /^Supermercado/ })).toContainText('$12.50')
    await expect(page.getByRole('link', { name: /^AAPL.*Compra/ })).toContainText('$200.00')
    await expectScreenQuality(page, `movements-all-${colorScheme}`)

    // One "Registrar gasto" on Movimientos and on Gastos, at any width.
    await expect(registerExpense(page)).toHaveCount(1)
    await page.goto('/expenses')
    await expect(rows(page)).toHaveCount(1)
    await expect(registerExpense(page)).toHaveCount(1)
    await page.goto('/movements')
    await expect(rows(page)).toHaveCount(6)

    // Filter by type; the address keeps the filter.
    await page.getByLabel('Tipo').selectOption('transfer')
    await expect(rows(page)).toHaveCount(1)
    await expect(page).toHaveURL(/\?type=transfer$/)
    await expect(row(page, 'Ahorro de noviembre', 'Editar transferencia')).toBeVisible()

    // A Transfer shows once, whichever of its two Accounts is chosen.
    await page.getByLabel('Tipo').selectOption('')
    await page.getByLabel('Cuenta').selectOption({ label: 'Ahorro' })
    await expect(rows(page)).toHaveCount(1)
    await page.getByLabel('Cuenta').selectOption({ label: 'Corriente' })
    await expect(rows(page)).toHaveCount(3)

    // The period includes both of its days.
    await page.getByLabel('Cuenta').selectOption('')
    await page.getByLabel('Desde').fill('2026-11-04')
    await page.getByLabel('Hasta').fill('2026-11-08')
    await expect(rows(page)).toHaveCount(3)
    await expect(row(page, 'AAPL', 'Editar dividendo')).toBeVisible()
    await expect(row(page, 'Salario', 'Editar ingreso')).toBeVisible()
    await expect(row(page, 'Ahorro de noviembre', 'Editar transferencia')).toBeVisible()
    await expectScreenQuality(page, `movements-filtered-${colorScheme}`)

    await page.getByLabel('Hasta').fill('2026-11-01')
    await expect(page.getByText('El período no puede terminar antes de empezar.')).toBeVisible()
    await expectScreenQuality(page, `movements-reversed-period-${colorScheme}`)

    // Nothing matches: say so and offer the way out.
    await page.getByLabel('Desde').fill('2026-10-01')
    await page.getByLabel('Hasta').fill('2026-10-31')
    await expect(page.getByRole('heading', { name: 'Ningún movimiento coincide con estos filtros' })).toBeVisible()
    await page.getByRole('button', { name: 'Quitar filtros' }).click()
    await expect(rows(page)).toHaveCount(6)

    // Each row opens the screen that edits its own record.
    await row(page, 'Supermercado', 'Editar gasto').click()
    await expect(page).toHaveURL(new RegExp(`/expenses/${expense.id}/edit$`))
  })
}

test('the address filters the view and an Account of someone else is not found', async ({ page, expectedProblems }) => {
  // The browser logs the 404 that api-service answers on purpose.
  expectedProblems.push(/status of 404/)
  await signUp(page.request)
  await seed(page)

  await page.goto('/movements?type=income')
  await expect(rows(page)).toHaveCount(1)
  await expect(page.getByLabel('Tipo')).toHaveValue('income')

  await page.goto('/movements?account=999999')
  await expect(page.getByText('La Cuenta elegida ya no existe. Elige otra o quita el filtro.')).toBeVisible()
})
