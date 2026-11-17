import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { archiveAccount, createAccount, createExpense } from './support/ledger.js'
import { signUp } from './support/session.js'

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

/** The shell's button on desktop or the floating one on a phone; both open the quick form. */
const openQuickForm = (page: Page) => page.getByRole('button', { name: 'Registrar gasto' }).click()

const submitButton = (page: Page) => page.getByRole('main').getByRole('button', { name: 'Registrar gasto' })

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

/** The row of an Expense in the list: one link to its edit screen. */
const expenseRow = (page: Page, title: string) => page.getByRole('link', { name: new RegExp(`^${title}.*Editar gasto$`) })

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

for (const colorScheme of ['light', 'dark'] as const) {
  test(`expenses lifecycle in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
    await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '500.00' })

    await page.goto('/expenses')
    await expect(page.getByRole('heading', { name: 'Aún no registras gastos' })).toBeVisible()
    await expectScreenQuality(page, `expenses-empty-${colorScheme}`)
    await page.getByRole('link', { name: 'Registrar tu primer gasto' }).click()

    await expect(page).toHaveURL(/\/expenses\/create$/)
    await expect(page.getByLabel('Fecha')).toHaveValue(panamaToday())
    await page.getByLabel('Monto').fill('12.50')
    await page.getByText('Alimentación', { exact: true }).click()
    await page.getByLabel('Descripción').fill('Supermercado')
    await expectScreenQuality(page, `expenses-create-filled-${colorScheme}`)
    await submitButton(page).click()

    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByRole('status').filter({ hasText: 'Registraste' })).toHaveText(
      'Registraste un gasto de $12.50 en Alimentación. Saldo de Cuenta corriente: $987.50.',
    )
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
    await expect(expenseRow(page, 'Supermercado')).toBeVisible()
    await expectScreenQuality(page, `expenses-list-${colorScheme}`)

    // Correcting the amount and moving the Expense to another Account updates both Balances.
    await expenseRow(page, 'Supermercado').click()
    await expect(page.getByLabel('Monto')).toHaveValue('12.50')
    await page.getByLabel('Monto').fill('20')
    await page.getByLabel('Cuenta', { exact: true }).selectOption({ label: 'Ahorro' })
    await expectScreenQuality(page, `expenses-edit-${colorScheme}`)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
      'Guardaste un gasto de $20.00 en Alimentación. Saldo de Ahorro: $480.00.',
    )
    await page.goto('/accounts')
    await expect(accountRow(page, 'Cuenta corriente')).toContainText('$1,000.00')
    await expect(accountRow(page, 'Ahorro')).toContainText('$480.00')

    await page.goto('/expenses')
    await expenseRow(page, 'Supermercado').click()
    await page.getByRole('link', { name: 'Eliminar este gasto' }).click()
    await expect(page).toHaveURL(/\/expenses\/\d+\/delete$/)
    await expect(page.getByText('El Saldo de Ahorro subirá $20.00.')).toBeVisible()
    await expectScreenQuality(page, `expenses-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar gasto' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toHaveText(
      'Eliminaste un gasto de $20.00 en Alimentación. Saldo de Ahorro: $500.00.',
    )
    await expect(page.getByRole('heading', { name: 'Aún no registras gastos' })).toBeVisible()
  })
}

test('the quick form proposes the last Account used, saves for real and lowers its Balance', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
  const savings = await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '500.00' })
  await createExpense(page.request, { account_id: savings.id, amount: '10.00' })

  await page.goto('/dashboard')
  await openQuickForm(page)
  const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
  await expect(sheet.getByLabel('Cuenta', { exact: true })).toHaveValue(String(savings.id))
  await expect(sheet.getByLabel('Monto')).toBeFocused()
  await sheet.getByLabel('Monto').fill('5')
  await sheet.getByText('Transporte', { exact: true }).click()
  await expect(sheet.getByText('Transporte no tiene Presupuesto este mes; el gasto se registra igual.')).toBeVisible()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Gasto de $5.00 registrado.' })).toContainText(
    'Saldo de Ahorro: $485.00.',
  )

  await page.goto('/accounts')
  await expect(accountRow(page, 'Ahorro')).toContainText('$485.00')
  await page.goto('/expenses')
  await expect(page.getByText('Mostrando 2 de 2 gastos.')).toBeVisible()

  await openQuickForm(page)
  await expect(page.getByRole('dialog').getByLabel('Cuenta', { exact: true })).toHaveValue(String(savings.id))
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('the quick form shows what is wrong without losing what was typed', async ({ page, expectedProblems }) => {
  // The archived Account is refused with a 4xx that the browser logs.
  expectedProblems.push(/status of 4\d\d/)
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Cuenta vieja' })
  await createAccount(page.request, { name: 'Cuenta nueva' })
  await createExpense(page.request, { account_id: account.id })

  await page.goto('/dashboard')
  await openQuickForm(page)
  const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(sheet.getByText('Escribe un monto mayor que cero')).toBeVisible()
  await expect(sheet.getByText('Elige la Categoría del gasto.')).toBeVisible()
  await expect(sheet.getByLabel('Monto')).toBeFocused()
  await expectScreenQuality(page, 'expenses-quick-sheet-errors')

  // The Account is archived elsewhere while the sheet is open: api-service refuses and the draft stays.
  await sheet.getByLabel('Cuenta', { exact: true }).selectOption({ label: 'Cuenta vieja' })
  await archiveAccount(page.request, account.id)
  await sheet.getByLabel('Monto').fill('7.25')
  await sheet.getByText('Salud', { exact: true }).click()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(sheet.getByText('Esta Cuenta está archivada y no admite registros nuevos')).toBeVisible()
  await expect(sheet.getByLabel('Monto')).toHaveValue('7.25')
  await expect(sheet.getByLabel('Cuenta', { exact: true })).toBeFocused()
})

test('registering rejects a future date and keeps the typed values', async ({ page, expectedProblems }) => {
  // The future date is refused with a 400 that the browser logs.
  expectedProblems.push(/status of 400/)
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request)

  await page.goto('/expenses/create')
  await page.getByLabel('Monto').fill('8')
  await page.getByText('Salud', { exact: true }).click()
  await page.getByLabel('Fecha').fill('2999-01-01')
  await submitButton(page).click()

  await expect(page.getByText('La fecha no puede ser futura')).toBeVisible()
  await expect(page.getByLabel('Fecha')).toBeFocused()
  await expectScreenQuality(page, 'expenses-create-future-date')
  await expect(page.getByLabel('Monto')).toHaveValue('8')
})

test('without a spending or savings Account the screens say what to do first', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })

  await page.goto('/expenses')
  await expect(page.getByRole('link', { name: 'Crear tu primera cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'expenses-list-needs-account')
  await page.goto('/expenses/create')
  await expect(page.getByRole('heading', { name: 'Primero necesitas una Cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'expenses-create-needs-account')
  await page.goto('/dashboard')
  await openQuickForm(page)
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Crear cuenta' })).toBeVisible()
})

test('the list shows loading, explains a failure and recovers on retry', async ({ page, expectedProblems }) => {
  // The test aborts the first list request on purpose.
  expectedProblems.push(/net::ERR_FAILED/)
  await signUp(page.request)
  const account = await createAccount(page.request)
  await createExpense(page.request, { account_id: account.id, description: 'Taxi' })

  let attempts = 0
  await page.route('**/api/movements?*', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      await route.abort('failed')
    } else {
      await route.continue()
    }
  })
  await page.goto('/expenses')

  await expect(page.getByText('Cargando tus gastos…')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar con Okane')
  await expectScreenQuality(page, 'expenses-list-load-failed')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(expenseRow(page, 'Taxi')).toBeVisible()
})

test('a save that fails offline is explained and can be repeated', async ({ page, expectedProblems }) => {
  // The test aborts the save on purpose.
  expectedProblems.push(/net::ERR_FAILED/)
  await signUp(page.request)
  await createAccount(page.request)
  await page.goto('/expenses/create')
  await page.getByLabel('Monto').fill('9.99')
  await page.getByText('Otros', { exact: true }).click()

  await page.route('**/api/expenses', (route) => route.abort('failed'))
  await submitButton(page).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar con Okane')
  await expect(page.getByLabel('Monto')).toHaveValue('9.99')

  await page.unroute('**/api/expenses')
  await submitButton(page).click()
  await expect(page).toHaveURL(/\/expenses$/)
})

test('an Expense that is not the User\'s, or does not exist, is not found', async ({ page, browser, expectedProblems }) => {
  // Foreign and unknown ids are answered with 404s that the browser logs.
  expectedProblems.push(/status of 404/)
  await signUp(page.request)
  const other = await browser.newContext()
  await signUp(other.request)
  const theirs = await createExpense(other.request, {
    account_id: (await createAccount(other.request)).id,
  })
  await other.close()

  for (const id of [String(theirs.id), '999999', 'abc']) {
    for (const action of ['edit', 'delete']) {
      await page.goto(`/expenses/${id}/${action}`)
      await expect(page.getByRole('heading', { name: 'No encontramos este gasto' })).toBeVisible()
    }
  }
})

test('an Expense on an Account archived since can still be corrected and deleted', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Cuenta vieja', opening_balance: '300.00' })
  await createExpense(page.request, { account_id: account.id, amount: '100.00', description: 'Cena' })
  await archiveAccount(page.request, account.id)

  await page.goto('/expenses')
  await expenseRow(page, 'Cena').click()
  await expect(page.getByLabel('Cuenta', { exact: true })).toHaveValue(String(account.id))
  await expect(page.getByText('Esta Cuenta está archivada.')).toBeVisible()
  await page.getByLabel('Monto').fill('60')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toContainText('Saldo de Cuenta vieja: $240.00.')

  await expenseRow(page, 'Cena').click()
  await page.getByRole('link', { name: 'Eliminar este gasto' }).click()
  await page.getByRole('button', { name: 'Eliminar gasto' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText('Saldo de Cuenta vieja: $300.00.')
})

test('the keyboard stays on "Mostrar más" while there are more pages', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { opening_balance: '5000.00' })
  for (let index = 0; index < 101; index += 1) {
    await createExpense(page.request, { account_id: account.id, amount: '1.00', description: `Gasto ${index}` })
  }

  await page.goto('/expenses')
  const more = page.getByRole('button', { name: 'Mostrar más' })
  await more.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText('Mostrando 100 de 101 gastos.')).toBeVisible()
  await expect(more).toBeFocused()
})

test('the list shows the next page on request and keeps day headings', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request, { opening_balance: '5000.00' })
  for (let index = 0; index < 51; index += 1) {
    await createExpense(page.request, {
      account_id: account.id,
      amount: '1.00',
      description: `Gasto ${String(index + 1).padStart(2, '0')}`,
      date: index < 3 ? '2026-11-10' : undefined,
    })
  }

  await page.goto('/expenses')
  await expect(page.getByText('Mostrando 50 de 51 gastos.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'lun 9 nov' })).toHaveCount(0)
  const more = page.getByRole('button', { name: 'Mostrar más' })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Mostrando 51 de 51 gastos.')).toBeVisible()
  // The button is gone: the keyboard moves to the first row that arrived instead of falling to the page.
  await expect(page.locator('a[id^=movement-expense-]').nth(50)).toBeFocused()
  await expect(page.getByRole('button', { name: 'Mostrar más' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'mar 10 nov' })).toBeVisible()
  expect(await noOverflow(page)).toBe(true)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  const inViewport = (page: Page, locator: ReturnType<Page['locator']>) =>
    locator.evaluate((element, height) => element.getBoundingClientRect().bottom <= height, 844).then(
      async (fitsBelow) => fitsBelow && (await locator.evaluate((element) => element.getBoundingClientRect().top >= 0)),
    )

  test('the quick sheet always shows its action, with and without the hint, and the fields do not jump', async ({
    page,
  }) => {
    await signUp(page.request)
    await createAccount(page.request)
    await page.goto('/dashboard')
    await openQuickForm(page)
    const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
    const submit = sheet.getByRole('button', { name: /Registrar gasto/ })

    expect(await inViewport(page, submit)).toBe(true)

    await sheet.getByText('Entretenimiento', { exact: true }).click()
    await expect(sheet.getByText('Escribe el monto para ver lo que queda en Entretenimiento.')).toBeVisible()
    expect(await inViewport(page, submit)).toBe(true)
    const accountTop = (await sheet.getByLabel('Cuenta', { exact: true }).boundingBox())?.y

    await sheet.getByLabel('Monto').fill('15')
    await expect(sheet.getByText(/Entretenimiento (quedará|no tiene)|Restante en Entretenimiento/)).toBeVisible()
    expect(await inViewport(page, submit)).toBe(true)
    expect((await sheet.getByLabel('Cuenta', { exact: true }).boundingBox())?.y).toBe(accountTop)

    // Fields scroll under the action row; the row stays where the thumb is.
    await sheet.getByLabel('Descripción').scrollIntoViewIfNeeded()
    expect(await inViewport(page, submit)).toBe(true)
  })

  test('a field loses its error and its red border as soon as the User changes it', async ({ page }) => {
    await signUp(page.request)
    await createAccount(page.request)
    await page.goto('/dashboard')
    await openQuickForm(page)
    const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
    await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
    await expect(sheet.getByLabel('Monto')).toHaveAttribute('aria-invalid', 'true')
    await expect(sheet.getByText('Elige la Categoría del gasto.')).toBeVisible()

    await sheet.getByLabel('Monto').fill('3')
    await expect(sheet.getByLabel('Monto')).toHaveAttribute('aria-invalid', 'false')
    await expect(sheet.getByText('Escribe un monto mayor que cero')).toHaveCount(0)
    await expect(sheet.getByText('Elige la Categoría del gasto.')).toBeVisible()

    await sheet.getByText('Salud', { exact: true }).click()
    await expect(sheet.getByText('Elige la Categoría del gasto.')).toHaveCount(0)
  })

  test('the full-page form clears a field error on change too', async ({ page, expectedProblems }) => {
  // The future date is refused with a 400 that the browser logs.
  expectedProblems.push(/status of 400/)
    await signUp(page.request)
    await createAccount(page.request, { opening_date: '2026-11-10' })
    await page.goto('/expenses/create')
    await page.getByLabel('Monto').fill('4')
    await page.getByText('Salud', { exact: true }).click()
    await page.getByLabel('Fecha').fill('2999-01-01')
    await submitButton(page).click()
    await expect(page.getByLabel('Fecha')).toHaveAttribute('aria-invalid', 'true')

    await page.getByLabel('Fecha').fill(panamaToday())

    await expect(page.getByLabel('Fecha')).toHaveAttribute('aria-invalid', 'false')
    await expect(page.getByText('La fecha no puede ser futura')).toHaveCount(0)
  })

  test('a row is one link that keeps the whole name and Account, and nothing else to tap', async ({ page }) => {
    await signUp(page.request)
    const account = await createAccount(page.request, { name: 'Cuenta corriente del hogar' })
    await createExpense(page.request, {
      account_id: account.id,
      amount: '1234.50',
      description: 'Supermercado de la esquina grande',
    })
    await page.goto('/expenses')

    const row = expenseRow(page, 'Supermercado de la esquina grande')
    await expect(row).toContainText('Supermercado de la esquina grande')
    await expect(row).toContainText('Alimentación · Cuenta corriente del hogar')
    await expect(row).toHaveAccessibleName(/^Supermercado de la esquina grande .*Cuenta corriente del hogar .*\$1,234\.50 \. Editar gasto$/)
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
    expect((await row.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    // The details wrap instead of being cut: every line of text fits its box.
    const clipped = await row.evaluate((link) =>
      [...link.querySelectorAll('span:not(.sr-only)')].some((span) => span.scrollWidth > span.clientWidth + 1),
    )
    expect(clipped).toBe(false)
    expect(await noOverflow(page)).toBe(true)

    await row.click()
    await expect(page).toHaveURL(/\/expenses\/\d+\/edit$/)
    const remove = page.getByRole('link', { name: 'Eliminar este gasto' })
    expect((await remove.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    await remove.click()
    await expect(page).toHaveURL(/\/expenses\/\d+\/delete$/)
  })

  test('every Category name fits its option and every control is at least 44px tall', async ({ page }) => {
    await signUp(page.request)
    const account = await createAccount(page.request)
    for (let index = 0; index < 51; index += 1) {
      await createExpense(page.request, { account_id: account.id, amount: '1.00' })
    }

    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/expenses/create')
      // The chosen option is in bolder type, so it is the widest.
      await page.getByText('Entretenimiento', { exact: true }).click()
      const options = page.locator('fieldset label')
      await expect(options).toHaveCount(8)
      // The grid is two columns at every width: the first two options share a row.
      const first = await options.nth(0).boundingBox()
      const second = await options.nth(1).boundingBox()
      expect(second?.y, `first row at ${width}px`).toBe(first?.y)
      expect(second?.x, `second column at ${width}px`).toBeGreaterThan(first?.x ?? 0)
      // Every name is one word: none is cut off, shown with an ellipsis, or broken inside the word.
      const names = page.locator('fieldset label span.min-w-0')
      const truncated = await names.evaluateAll((spans) =>
        spans.filter(
          (span) =>
            span.scrollWidth > span.clientWidth + 1 || getComputedStyle(span).textOverflow === 'ellipsis',
        ).length,
      )
      expect(truncated, `names truncated at ${width}px`).toBe(0)
      const linesPerName = await names.evaluateAll((spans) =>
        spans.map((span) => {
          const range = document.createRange()
          range.selectNodeContents(span)
          return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
        }),
      )
      expect(linesPerName, `names split across lines at ${width}px`).toEqual(linesPerName.map(() => 1))
      for (const option of await options.all()) {
        expect((await option.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      }
      expect((await page.getByRole('link', { name: 'Gastos' }).first().boundingBox())?.height).toBeGreaterThanOrEqual(44)
    }

    await page.goto('/expenses')
    expect((await page.getByRole('button', { name: 'Mostrar más' }).boundingBox())?.height).toBeGreaterThanOrEqual(44)
  })

  test('a date before the Account started names the day the way the app writes dates', async ({ page, expectedProblems }) => {
  // The early date is refused with a 400 that the browser logs.
  expectedProblems.push(/status of 400/)
    await signUp(page.request)
    await createAccount(page.request, { opening_date: '2026-11-10' })
    await page.goto('/expenses/create')
    await expect(page.getByLabel('Fecha')).toHaveAttribute('min', '2026-11-10')

    await page.getByLabel('Monto').fill('4')
    await page.getByText('Salud', { exact: true }).click()
    await page.getByLabel('Fecha').fill('2026-11-01')
    await submitButton(page).click()

    await expect(page.getByText('La fecha no puede ser anterior al inicio del registro de la Cuenta (10 nov 2026).')).toBeVisible()
  })
})

test('an amount past twelve digits says it is too large', async ({ page, expectedProblems }) => {
  // The oversized amount is refused with a 400 that the browser logs.
  expectedProblems.push(/status of 400/)
  await signUp(page.request)
  await createAccount(page.request)
  await page.goto('/expenses/create')
  await page.getByLabel('Monto').fill('1000000000000')
  await page.getByText('Salud', { exact: true }).click()
  await submitButton(page).click()

  await expect(page.getByText('El monto es demasiado grande.')).toBeVisible()
})

test('a comma works as the decimal separator', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { opening_balance: '100.00' })
  await page.goto('/expenses/create')
  await page.getByLabel('Monto').fill('12,5')
  await page.getByText('Salud', { exact: true }).click()
  await submitButton(page).click()

  await expect(page.getByRole('status').filter({ hasText: 'Registraste' })).toContainText('$12.50')
})

test('the quick sheet over a full-page form does not repeat its ids', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request)
  await page.goto('/expenses/create')
  await openQuickForm(page)
  await expect(page.getByRole('dialog').getByLabel('Monto')).toBeVisible()

  const repeated = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id)
    return ids.filter((id, index) => ids.indexOf(id) !== index)
  })
  expect(repeated).toEqual([])
})
