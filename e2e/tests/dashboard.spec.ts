import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { createAccount, createBudget, createExpense, createIncome, createRecurringPayment } from './support/ledger.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())
const thisMonth = () => panamaToday().slice(0, 7)

function previousMonth() {
  const total = Number(thisMonth().slice(0, 4)) * 12 + Number(thisMonth().slice(5, 7)) - 2
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const openQuickForm = (page: Page) => page.getByRole('button', { name: 'Registrar gasto' }).click()

const card = (page: Page, name: string) => page.getByRole('region', { name })

/**
 * Cuenta corriente $1,000, an Alimentación Budget of $300 with $40 spent, an
 * Income of $100, a rule held back since last month ($100 twice: one overdue
 * occurrence and this month's) and a $50 payment at month end.
 * Disponible: 1000 - 40 + 100 - 200 - 50 = 810.
 */
async function seedMonth(page: Page) {
  const account = await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
  await createBudget(page.request, { month: thisMonth(), category: 'food', amount: '300.00' })
  await createExpense(page.request, { account_id: account.id, amount: '40.00', category: 'food', description: 'Supermercado' })
  await createIncome(page.request, { account_id: account.id, amount: '100.00', description: 'Sueldo' })
  await createRecurringPayment(page.request, {
    account_id: account.id,
    start_date: `${previousMonth()}-01`,
    day_of_month: 1,
    amount: '100.00',
    category: 'housing',
    description: 'Alquiler',
  })
  await createRecurringPayment(page.request, {
    account_id: account.id,
    start_date: `${thisMonth()}-01`,
    day_of_month: 31,
    amount: '50.00',
    category: 'utilities',
    description: 'Internet',
  })
  return account
}

test('a new User lands on the Panel, sees what to do first and the figures stay theirs', async ({ page, browser }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await seedMonth(page)

  const stranger = await browser.newContext()
  const strangerPage = await stranger.newPage()
  await signUp(strangerPage.request)
  await strangerPage.goto('/dashboard')
  await expect(strangerPage.getByRole('heading', { name: 'Empieza creando tu primera Cuenta' })).toBeVisible()
  await expect(strangerPage.getByText('Disponible hasta fin de mes')).toBeHidden()
  await expect(strangerPage.getByText('Supermercado')).toBeHidden()
  await stranger.close()

  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$810.00')
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the Panel shows the real figures of the month in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)

    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Empieza creando tu primera Cuenta' })).toBeVisible()
    await expectScreenQuality(page, `dashboard-empty-${colorScheme}`)

    await seedMonth(page)
    await page.goto('/dashboard')

    const available = card(page, 'Disponible hasta fin de mes')
    await expect(available).toContainText('$810.00')
    await expect(available).toContainText('Saldo en Cuentas de gastos$1,060.00')
    await expect(available).toContainText('Comprometido en 3 pagos$250.00')
    await expect(available).toContainText(/\$[\d,.]+ (por día|para hoy)/)

    await expect(card(page, 'Restante por Categoría').getByRole('link', { name: /^Alimentación/ })).toContainText('$260.00')
    await expect(card(page, 'Patrimonio')).toContainText('$1,060.00')
    await expect(card(page, 'Patrimonio')).toContainText('Ahorro neto$60.00')
    await expect(card(page, 'Comprometido')).toContainText('Vencidos')
    await expect(card(page, 'Comprometido').getByRole('link', { name: /^Internet/ })).toContainText('$50.00')
    await expect(card(page, 'Cuentas').getByRole('link', { name: /^Cuenta corriente/ })).toContainText('$1,060.00')
    await expect(page.getByText('Estás viendo datos de ejemplo')).toBeHidden()
    await expectScreenQuality(page, `dashboard-month-${colorScheme}`)
  })
}

test('an Expense registered from the Panel updates Disponible and Restante without reloading', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await seedMonth(page)
  await page.goto('/dashboard')
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$810.00')

  await openQuickForm(page)
  const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
  await sheet.getByLabel('Monto').fill('10')
  await sheet.getByText('Alimentación', { exact: true }).click()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(sheet).toBeHidden()

  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$800.00')
  await expect(card(page, 'Restante por Categoría').getByRole('link', { name: /^Alimentación/ })).toContainText('$250.00')
  await expect(card(page, 'Patrimonio')).toContainText('Ahorro neto$50.00')
})

test('confirming an overdue payment from the Panel moves its money once', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await seedMonth(page)
  await page.goto('/dashboard')

  const committed = card(page, 'Comprometido')
  await expect(committed.getByRole('heading', { name: 'Vencidos' })).toBeVisible()
  await committed.getByRole('link', { name: /^Alquiler.*Venció/ }).first().click()
  await expect(page).toHaveURL(/\/recurring-payments\/occurrences\/\d+\/confirm$/)
  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(page).toHaveURL(/\/recurring-payments$/)

  await page.goto('/dashboard')
  // The paid $100 left the Saldo and the Comprometido together: Disponible does not drop twice.
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$810.00')
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('Saldo en Cuentas de gastos$960.00')
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('Comprometido en 2 pagos$150.00')
})
