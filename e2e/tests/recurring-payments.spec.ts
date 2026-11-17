import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { cancelOccurrence, createAccount, createExpense, createRecurringPayment, listOccurrenceIds } from './support/ledger.js'
import { signUp } from './support/session.js'

/** A calendar day in America/Panama, `daysAgo` days before today. */
function panamaDay(daysAgo = 0) {
  const day = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(day)
}

const firstOfThisMonth = () => `${panamaDay().slice(0, 8)}01`

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })
const reviewLink = (page: Page, title: string) => page.getByRole('link', { name: new RegExp(`^${title}\\b.*Revisar pago$`) })
const ruleLink = (page: Page, title: string) => page.getByRole('link', { name: new RegExp(`^${title}\\b.*Editar pago recurrente$`) })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`rules lifecycle in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })

    await page.goto('/recurring-payments')
    await expect(page.getByRole('heading', { name: 'Aún no tienes pagos recurrentes' })).toBeVisible()
    await expectScreenQuality(page, `recurring-empty-${colorScheme}`)
    await page.getByRole('link', { name: 'Crear tu primer pago recurrente' }).click()

    await expect(page).toHaveURL(/\/recurring-payments\/create$/)
    await expect(page.getByLabel('Desde')).toHaveValue(panamaDay())
    await page.getByLabel('Monto').fill('45')
    await page.getByText('Servicios', { exact: true }).click()
    await page.getByLabel('Día del mes').fill('31')
    await page.getByLabel('Descripción').fill('Internet')
    await expectScreenQuality(page, `recurring-create-filled-${colorScheme}`)
    await page.getByRole('button', { name: 'Crear pago recurrente' }).click()

    await expect(page).toHaveURL(/\/recurring-payments$/)
    await expect(page.getByRole('status').filter({ hasText: 'Creaste' })).toHaveText(
      'Creaste el pago recurrente Internet de $45.00.',
    )
    await expect(ruleLink(page, 'Internet')).toContainText('Día 31 de cada mes')
    await expectScreenQuality(page, `recurring-list-rules-${colorScheme}`)

    // A populated list keeps its create action at the top right.
    await page.getByRole('link', { name: 'Nuevo pago recurrente' }).click()
    await expect(page).toHaveURL(/\/recurring-payments\/create$/)
    await page.goBack()

    await ruleLink(page, 'Internet').click()
    await expect(page.getByLabel('Monto')).toHaveValue('45.00')
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
    await page.getByLabel('Monto').fill('50')
    await expectScreenQuality(page, `recurring-edit-${colorScheme}`)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
      'Guardaste el pago recurrente Internet de $50.00.',
    )

    await ruleLink(page, 'Internet').click()
    await page.getByRole('link', { name: 'Eliminar este pago recurrente' }).click()
    await expect(page).toHaveURL(/\/recurring-payments\/\d+\/delete$/)
    await expect(page.getByRole('button', { name: 'Eliminar pago recurrente' })).toBeVisible()
    await expectScreenQuality(page, `recurring-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar pago recurrente' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText('se conservan')
    // The reservation made on creation is kept and still waits for an answer; the rule itself is gone.
    await expect(reviewLink(page, 'Internet')).toBeVisible()
    await expect(ruleLink(page, 'Internet')).toBeHidden()
    await expectScreenQuality(page, `recurring-list-after-delete-${colorScheme}`)
  })

  test(`confirming and cancelling reservations in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const account = await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
    await createRecurringPayment(page.request, {
      account_id: account.id,
      start_date: firstOfThisMonth(),
      amount: '100.00',
      category_id: 4,
      description: 'Luz',
    })
    await createRecurringPayment(page.request, {
      account_id: account.id,
      start_date: firstOfThisMonth(),
      amount: '30.00',
      category_id: 6,
      description: 'Streaming',
    })

    await page.goto('/recurring-payments')
    await expect(page.getByRole('heading', { name: 'Por confirmar' })).toBeVisible()
    await expect(reviewLink(page, 'Luz')).toContainText(/Vence|Venció/)
    await expectScreenQuality(page, `recurring-list-pending-${colorScheme}`)

    // Confirming reviews the amount; the Expense lowers the Balance by what was really paid.
    await reviewLink(page, 'Luz').click()
    await expect(page).toHaveURL(/\/recurring-payments\/occurrences\/\d+\/confirm$/)
    await expect(page.getByLabel('Monto')).toHaveValue('100.00')
    await expect(page.getByLabel('Fecha')).toHaveValue(panamaDay())
    await expect(page.getByText('Se registrará un gasto de $100.00 en Servicios desde Cuenta corriente.')).toBeVisible()
    await page.getByLabel('Monto').fill('120')
    await expectScreenQuality(page, `recurring-confirm-${colorScheme}`)
    await page.getByRole('button', { name: 'Confirmar pago' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Confirmaste' })).toHaveText(
      'Confirmaste Luz: registraste un gasto de $120.00. Saldo de Cuenta corriente: $880.00.',
    )
    await expect(reviewLink(page, 'Luz')).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Ya resueltos' })).toBeVisible()
    await expect(page.getByRole('listitem').filter({ hasText: 'Luz' }).filter({ hasText: 'Pagado' })).toContainText('$100.00')

    await page.goto('/accounts')
    await expect(accountRow(page, 'Cuenta corriente')).toContainText('$880.00')
    await page.goto('/expenses')
    await expect(page.getByRole('link', { name: /^Luz.*Editar gasto$/ })).toContainText('$120.00')

    // The Expense says where it came from, on the edit and the delete screens.
    await page.getByRole('link', { name: /^Luz.*Editar gasto$/ }).click()
    await expect(page.getByText('Este gasto viene de un pago recurrente confirmado. Cambiarlo no reabre la reserva')).toBeVisible()
    await expectScreenQuality(page, `recurring-expense-edit-origin-${colorScheme}`)
    await page.getByRole('link', { name: 'Eliminar este gasto' }).click()
    await expect(page.getByText('Este gasto viene de un pago recurrente confirmado. Eliminarlo no reabre la reserva')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Eliminar gasto' })).toBeVisible()
    await expectScreenQuality(page, `recurring-expense-delete-origin-${colorScheme}`)

    // Cancelling releases the reservation and registers nothing.
    await page.goto('/recurring-payments')
    await reviewLink(page, 'Streaming').click()
    await page.getByRole('link', { name: /cancelar esta reserva/ }).click()
    await expect(page).toHaveURL(/\/occurrences\/\d+\/cancel$/)
    await expect(page.getByRole('button', { name: 'Cancelar reserva' })).toBeVisible()
    await expectScreenQuality(page, `recurring-cancel-${colorScheme}`)
    await page.getByRole('button', { name: 'Cancelar reserva' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Cancelaste' })).toContainText('no se registró ningún gasto')
    await expect(page.getByRole('listitem').filter({ hasText: 'Streaming' }).filter({ hasText: 'Cancelado' })).toBeVisible()
    await expectScreenQuality(page, `recurring-list-resolved-${colorScheme}`)
    await page.goto('/accounts')
    await expect(accountRow(page, 'Cuenta corriente')).toContainText('$880.00')
  })
}

test('reservations from earlier months stay pending, oldest first', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
  await createRecurringPayment(page.request, {
    account_id: account.id,
    start_date: panamaDay(70),
    description: 'Alquiler',
  })

  await page.goto('/recurring-payments')
  await expect(page.getByRole('heading', { name: 'Por confirmar' })).toBeVisible()
  const rows = page.getByRole('link', { name: /^Alquiler\b.*Revisar pago$/ })
  // Day 1 of each month since the start: the first row is the oldest, each next one is a month later.
  const first = new Date(Date.parse(`${panamaDay(70)}T00:00:00Z`))
  const oldest = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + (first.getUTCDate() > 1 ? 1 : 0), 1))
  const monthLabel = (offset: number) => {
    const day = new Date(Date.UTC(oldest.getUTCFullYear(), oldest.getUTCMonth() + offset, 1))
    const parts = new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'short', year: 'numeric' }).formatToParts(day)
    const part = (type: string) => (parts.find((item) => item.type === type)?.value ?? '').replace('.', '')
    return `${part('month')} ${part('year')}`
  }
  await expect(rows.first()).toContainText(`Venció 1 ${monthLabel(0)}`)
  await expect(rows.nth(1)).toContainText(`1 ${monthLabel(1)}`)
  expect(await rows.count()).toBeGreaterThanOrEqual(2)
  await expectScreenQuality(page, 'recurring-list-carried-over')
})

test('confirming rejects a bad date and keeps what was typed; a resolved reservation says so', async ({ page, expectedProblems }) => {
  // api-service refuses the stale confirmation with a 409 that the browser logs.
  expectedProblems.push(/status of 409/)
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
  const rule = await createRecurringPayment(page.request, {
    account_id: account.id,
    start_date: firstOfThisMonth(),
    description: 'Seguro',
    category_id: 5,
  })
  await page.goto('/recurring-payments')
  const [occurrenceId] = await listOccurrenceIds(page.request, rule.id)

  await page.goto(`/recurring-payments/occurrences/${occurrenceId}/confirm`)
  await page.getByLabel('Fecha').fill('2999-01-01')
  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(page.getByText('La fecha no puede ser futura')).toBeVisible()
  await expect(page.getByLabel('Fecha')).toBeFocused()
  await expectScreenQuality(page, 'recurring-confirm-future-date')

  await page.getByLabel('Fecha').fill(new Date(Date.parse(`${firstOfThisMonth()}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(page.getByText('La fecha no puede ser anterior a la entrada de la reserva')).toBeVisible()

  // Another tab cancels the reservation: the stale form is refused and says why.
  await page.getByLabel('Fecha').fill(panamaDay())
  await page.getByLabel('Monto').fill('90')
  await cancelOccurrence(page.request, occurrenceId)
  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(page.getByRole('alert')).toContainText('ya se canceló')
  await expect(page.getByLabel('Monto')).toHaveValue('90')
  // The reservation was answered elsewhere, so confirming is no longer offered.
  await expect(page.getByRole('button', { name: 'Confirmar pago' })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Volver a pagos recurrentes' })).toBeVisible()
  await expectScreenQuality(page, 'recurring-confirm-conflict')

  await page.goto(`/recurring-payments/occurrences/${occurrenceId}/confirm`)
  await expect(page.getByText('Esta reserva se canceló y su dinero está libre.')).toBeVisible()
  await expectScreenQuality(page, 'recurring-confirm-resolved')
  await page.goto(`/recurring-payments/occurrences/${occurrenceId}/cancel`)
  await expect(page.getByText('Esta reserva ya estaba cancelada.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar reserva' })).toBeHidden()
})

test('an Account with rules or pending reservations cannot be archived and says why', async ({ page, expectedProblems }) => {
  // api-service refuses the archive with a 409 that the browser logs.
  expectedProblems.push(/status of 409/)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Cuenta corriente' })
  await createRecurringPayment(page.request, { account_id: account.id, start_date: firstOfThisMonth(), description: 'Luz' })

  await page.goto(`/accounts/${account.id}/delete`)
  await page.getByRole('button', { name: 'Archivar cuenta' }).click()
  await expect(page.getByRole('alert')).toContainText('Mueve o elimina los pagos recurrentes de esta Cuenta antes de archivarla.')
  await expect(page.getByRole('alert')).toContainText('Confirma o cancela los pagos recurrentes pendientes')
  await expectScreenQuality(page, 'recurring-account-archive-blocked')
})

test('an Expense registered by hand carries no recurring origin note', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request)
  const expense = await createExpense(page.request, { account_id: account.id, description: 'Taxi' })

  await page.goto(`/expenses/${expense.id}/edit`)
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible()
  await expect(page.getByText('viene de un pago recurrente')).toBeHidden()
  await page.goto(`/expenses/${expense.id}/delete`)
  await expect(page.getByRole('button', { name: 'Eliminar gasto' })).toBeVisible()
  await expect(page.getByText('viene de un pago recurrente')).toBeHidden()
})

test('creating a rule shows what is wrong without losing what was typed', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request)

  await page.goto('/recurring-payments/create')
  await page.getByLabel('Día del mes').fill('32')
  await page.getByRole('button', { name: 'Crear pago recurrente' }).click()
  await expect(page.getByText('Escribe un monto mayor que cero')).toBeVisible()
  await expect(page.getByText('Elige la Categoría del pago.')).toBeVisible()
  await expect(page.getByText('Escribe un día del mes entre 1 y 31.')).toBeVisible()
  await expect(page.getByLabel('Monto')).toBeFocused()
  await expectScreenQuality(page, 'recurring-create-errors')
  await expect(page.getByLabel('Día del mes')).toHaveValue('32')
})

test('without a spending or savings Account the screens say what to do first', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })

  await page.goto('/recurring-payments')
  await expect(page.getByRole('link', { name: 'Crear tu primera cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'recurring-list-needs-account')
  await page.goto('/recurring-payments/create')
  await expect(page.getByRole('heading', { name: 'Primero necesitas una Cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'recurring-create-needs-account')
})

test('a rule or reservation that is not here says so', async ({ page, expectedProblems }) => {
  // The unknown ids are answered with 404s that the browser logs.
  expectedProblems.push(/status of 404/)
  await signUp(page.request)

  await page.goto('/recurring-payments/999999/edit')
  await expect(page.getByRole('heading', { name: 'No encontramos este pago recurrente' })).toBeVisible()
  await expectScreenQuality(page, 'recurring-rule-not-here')
  await page.goto('/recurring-payments/occurrences/999999/confirm')
  await expect(page.getByRole('heading', { name: 'No encontramos esta reserva' })).toBeVisible()
  await expectScreenQuality(page, 'recurring-occurrence-not-here')
})

test('the list shows loading, explains a failure and recovers on retry', async ({ page, expectedProblems }) => {
  // The test aborts the first list request on purpose.
  expectedProblems.push(/net::ERR_FAILED/)
  await signUp(page.request)
  const account = await createAccount(page.request)
  await createRecurringPayment(page.request, { account_id: account.id, start_date: firstOfThisMonth(), description: 'Agua' })

  let attempts = 0
  await page.route('**/api/recurring-payments?*', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      await route.abort('failed')
    } else {
      await route.continue()
    }
  })
  await page.goto('/recurring-payments')

  await expect(page.getByText('Cargando tus pagos recurrentes…')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  await expectScreenQuality(page, 'recurring-list-failed')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(ruleLink(page, 'Agua')).toBeVisible()
})
