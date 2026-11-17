import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { createAccount, createBudget, createExpense } from './support/ledger.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())
const thisMonth = () => panamaToday().slice(0, 7)

function shiftMonth(month: string, offset: number) {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + offset
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** "Noviembre 2026", as the screens write a month. */
function monthLabel(month: string) {
  const name = new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'long' }).format(new Date(`${month}-01T00:00:00Z`))
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`
}

const openQuickForm = (page: Page) => page.getByRole('button', { name: 'Registrar gasto' }).click()

const budgetRow = (page: Page, category: string) =>
  page.getByRole('link', { name: new RegExp(`^${category}, `) })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`budgets lifecycle in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const account = await createAccount(page.request, { name: 'Cuenta corriente' })
    const month = thisMonth()

    await page.goto('/budgets')
    await expect(page.getByRole('heading', { name: `Sin Presupuestos en ${monthLabel(month)}` })).toBeVisible()
    await expectScreenQuality(page, `budgets-empty-${colorScheme}`)
    await page.getByRole('link', { name: 'Crear un Presupuesto' }).click()

    await expect(page).toHaveURL(/\/budgets\/create/)
    await expect(page.getByLabel('Mes', { exact: true })).toHaveValue(month)
    await page.getByText('Alimentación', { exact: true }).click()
    await page.getByLabel('Monto del Presupuesto').fill('300')
    await expectScreenQuality(page, `budgets-create-filled-${colorScheme}`)
    await page.getByRole('button', { name: 'Crear Presupuesto' }).click()

    await expect(page).toHaveURL(/\/budgets\?month=/)
    await expect(page.getByRole('status').filter({ hasText: 'Creaste' })).toHaveText(
      `Creaste un Presupuesto de $300.00 para Alimentación en ${monthLabel(month)}.`,
    )
    await expect(budgetRow(page, 'Alimentación')).toContainText('$300.00')

    // An Expense lowers the Restante; one that passes the Budget is accepted and the Category is exceeded.
    await createExpense(page.request, { account_id: account.id, amount: '120.00', category_id: 2 })
    await page.goto('/budgets')
    await expect(budgetRow(page, 'Alimentación')).toContainText('Gastado $120.00 de $300.00')
    await expect(budgetRow(page, 'Alimentación')).toContainText('$180.00')
    await expectScreenQuality(page, `budgets-list-${colorScheme}`)

    await budgetRow(page, 'Alimentación').click()
    await expect(page.getByLabel('Monto del Presupuesto')).toHaveValue('300.00')
    await page.getByLabel('Monto del Presupuesto').fill('100')
    await expectScreenQuality(page, `budgets-edit-${colorScheme}`)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toContainText('$100.00')
    await expect(budgetRow(page, 'Alimentación')).toContainText('Excedida por $20.00')
    await expect(budgetRow(page, 'Alimentación')).toContainText('−$20.00')
    await expectScreenQuality(page, `budgets-list-exceeded-${colorScheme}`)

    await budgetRow(page, 'Alimentación').click()
    await page.getByRole('link', { name: 'Eliminar este Presupuesto' }).click()
    await expect(page).toHaveURL(/\/budgets\/\d+\/delete$/)
    await expect(page.getByText('Tus gastos no cambian.')).toBeVisible()
    await expectScreenQuality(page, `budgets-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar Presupuesto' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText('$100.00')
    // Without a Budget the Category shows only what it spent, never a Restante.
    await expect(page.getByRole('heading', { name: 'Gastado sin Presupuesto' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Alimentación, Sin Presupuesto.*\$120\.00$/ })).toBeVisible()
    await expect(page.getByText('Restante por Categoría')).toBeHidden()
    await expectScreenQuality(page, `budgets-unbudgeted-${colorScheme}`)
  })
}

test('the quick form reads the real Restante and accepts an Expense that exceeds the Budget', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
  await createBudget(page.request, { month: thisMonth(), category_id: 2, amount: '300.00' })

  await page.goto('/dashboard')
  await openQuickForm(page)
  const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
  await sheet.getByLabel('Monto').fill('12')
  await sheet.getByText('Alimentación', { exact: true }).click()
  await expect(sheet.getByText('Restante en Alimentación: de $300.00 a $288.00.')).toBeVisible()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Gasto de $12.00 registrado.' })).toContainText(
    'Restante en Alimentación: $288.00.',
  )

  await openQuickForm(page)
  await sheet.getByLabel('Monto').fill('400')
  await sheet.getByText('Alimentación', { exact: true }).click()
  await expect(sheet.getByText('Alimentación quedará excedida por $112.00; el gasto se registra igual.')).toBeVisible()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Gasto de $400.00 registrado.' })).toContainText(
    'Alimentación queda excedida por $112.00.',
  )

  await sheet.waitFor({ state: 'hidden' })
  await openQuickForm(page)
  await sheet.getByLabel('Monto').fill('5')
  await sheet.getByText('Transporte', { exact: true }).click()
  await expect(sheet.getByText('Transporte no tiene Presupuesto este mes; el gasto se registra igual.')).toBeVisible()
})

test('a past month can be browsed and its Budget edited', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request)
  const previous = shiftMonth(thisMonth(), -1)
  await createBudget(page.request, { month: previous, category_id: 4, amount: '80.00' })

  await page.goto('/budgets')
  await page.getByRole('link', { name: 'Mes anterior' }).click()
  await expect(page.getByRole('navigation', { name: 'Mes de los Presupuestos' })).toContainText(monthLabel(previous))
  await expect(budgetRow(page, 'Servicios')).toContainText('$80.00')
  await expectScreenQuality(page, 'budgets-past-month')

  await budgetRow(page, 'Servicios').click()
  await page.getByLabel('Monto del Presupuesto').fill('95')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page).toHaveURL(new RegExp(`/budgets\\?month=${previous}`))
  await expect(budgetRow(page, 'Servicios')).toContainText('$95.00')

  await page.getByRole('link', { name: 'Mes actual' }).click()
  await expect(page.getByRole('heading', { name: `Sin Presupuestos en ${monthLabel(thisMonth())}` })).toBeVisible()
})

test('a second Budget for the same Category and month is refused and the draft stays', async ({
  page,
  expectedProblems,
}) => {
  // api-service answers the duplicate with a 409 that the browser logs.
  expectedProblems.push(/status of 409/)
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createBudget(page.request, { month: thisMonth(), category_id: 5, amount: '60.00' })

  await page.goto('/budgets/create')
  await page.getByText('Salud', { exact: true }).click()
  await page.getByLabel('Monto del Presupuesto').fill('75')
  await page.getByRole('button', { name: 'Crear Presupuesto' }).click()

  await expect(page.getByText('Esta Categoría ya tiene un presupuesto en ese mes. Edita el existente.')).toBeVisible()
  await expect(page.getByLabel('Monto del Presupuesto')).toHaveValue('75')
  await expectScreenQuality(page, 'budgets-create-duplicate')
})

test('the form says what is missing before sending, and an unknown Budget is not here', async ({
  page,
  expectedProblems,
}) => {
  // The unknown Budget is answered with a 404 that the browser logs.
  expectedProblems.push(/status of 404/)
  forbidBrowserDialogs(page)
  await signUp(page.request)

  await page.goto('/budgets/create')
  await page.getByRole('button', { name: 'Crear Presupuesto' }).click()
  await expect(page.getByText('Elige la Categoría del Presupuesto.')).toBeVisible()
  await expect(page.getByText('Escribe un monto mayor que cero')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Vivienda' })).toBeFocused()
  await expectScreenQuality(page, 'budgets-create-errors')

  await page.goto('/budgets/999999/edit')
  await expect(page.getByRole('heading', { name: 'No encontramos este Presupuesto' })).toBeVisible()
  await page.goto('/budgets/abc/delete')
  await expect(page.getByRole('heading', { name: 'No encontramos este Presupuesto' })).toBeVisible()
})
