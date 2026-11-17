import { expect, test, type Page } from '@playwright/test'
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

for (const width of [390, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`expenses lifecycle at ${width}px in ${colorScheme}`, async ({ page }) => {
      forbidBrowserDialogs(page)
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme })
      await signUp(page.request)
      await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
      await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '500.00' })

      await page.goto('/expenses')
      await expect(page.getByRole('heading', { name: 'Aún no registras gastos' })).toBeVisible()
      await page.getByRole('link', { name: 'Registrar tu primer gasto' }).click()

      await expect(page).toHaveURL(/\/expenses\/create$/)
      await expect(page.getByLabel('Fecha')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/)
      await page.getByLabel('Monto').fill('12.50')
      await page.getByText('Alimentación', { exact: true }).click()
      await page.getByLabel('Descripción').fill('Supermercado')
      expect(await noOverflow(page)).toBe(true)
      await submitButton(page).click()

      await expect(page).toHaveURL(/\/expenses$/)
      await expect(page.getByRole('status').filter({ hasText: 'Registraste' })).toHaveText(
        'Registraste un gasto de $12.50 en Alimentación. Saldo de Cuenta corriente: $987.50.',
      )
      await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Supermercado' })).toBeVisible()
      expect(await noOverflow(page)).toBe(true)

      // Correcting the amount and moving the Expense to another Account updates both Balances.
      await page.getByRole('link', { name: 'Editar Supermercado, $12.50' }).click()
      await expect(page.getByLabel('Monto')).toHaveValue('12.50')
      await page.getByLabel('Monto').fill('20')
      await page.getByLabel('Cuenta').selectOption({ label: 'Ahorro' })
      expect(await noOverflow(page)).toBe(true)
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
        'Guardaste un gasto de $20.00 en Alimentación. Saldo de Ahorro: $480.00.',
      )
      await page.goto('/accounts')
      await expect(accountRow(page, 'Cuenta corriente')).toContainText('$1,000.00')
      await expect(accountRow(page, 'Ahorro')).toContainText('$480.00')

      await page.goto('/expenses')
      await page.getByRole('link', { name: 'Eliminar Supermercado, $20.00' }).click()
      await expect(page).toHaveURL(/\/expenses\/\d+\/delete$/)
      await expect(page.getByText('El Saldo de Ahorro pasará de $480.00 a $500.00.')).toBeVisible()
      expect(await noOverflow(page)).toBe(true)
      await page.getByRole('button', { name: 'Eliminar gasto' }).click()

      await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toHaveText(
        'Eliminaste un gasto de $20.00 en Alimentación. Saldo de Ahorro: $500.00.',
      )
      await expect(page.getByRole('heading', { name: 'Aún no registras gastos' })).toBeVisible()
    })
  }
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
  await expect(sheet.getByLabel('Cuenta')).toHaveValue(String(savings.id))
  await expect(sheet.getByLabel('Monto')).toBeFocused()
  await sheet.getByLabel('Monto').fill('5')
  await sheet.getByText('Transporte', { exact: true }).click()
  await expect(sheet.locator('p[aria-live=polite]')).toContainText('Transporte')
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Gasto de $5.00 registrado.' })).toBeVisible()

  await page.goto('/accounts')
  await expect(accountRow(page, 'Ahorro')).toContainText('$485.00')
  await page.goto('/expenses')
  await expect(page.getByText('Mostrando 2 de 2 gastos.')).toBeVisible()

  await openQuickForm(page)
  await expect(page.getByRole('dialog').getByLabel('Cuenta')).toHaveValue(String(savings.id))
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('the quick form shows what is wrong without losing what was typed', async ({ page }) => {
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

  // The Account is archived elsewhere while the sheet is open: api-service refuses and the draft stays.
  await sheet.getByLabel('Cuenta').selectOption({ label: 'Cuenta vieja' })
  await archiveAccount(page.request, account.id)
  await sheet.getByLabel('Monto').fill('7.25')
  await sheet.getByText('Salud', { exact: true }).click()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(sheet.getByText('Esta Cuenta está archivada y no admite registros nuevos')).toBeVisible()
  await expect(sheet.getByLabel('Monto')).toHaveValue('7.25')
  await expect(sheet.getByLabel('Cuenta')).toBeFocused()
})

test('registering rejects a future date and keeps the typed values', async ({ page }) => {
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
  await expect(page.getByLabel('Monto')).toHaveValue('8')
})

test('without a spending or savings Account the screens say what to do first', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Bróker', type: 'investment' })

  await page.goto('/expenses')
  await expect(page.getByRole('link', { name: 'Crear tu primera cuenta' })).toBeVisible()
  await page.goto('/expenses/create')
  await expect(page.getByRole('heading', { name: 'Primero necesitas una Cuenta' })).toBeVisible()
  await page.goto('/dashboard')
  await openQuickForm(page)
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Crear cuenta' })).toBeVisible()
})

test('the list shows loading, explains a failure and recovers on retry', async ({ page }) => {
  await signUp(page.request)
  const account = await createAccount(page.request)
  await createExpense(page.request, { account_id: account.id, description: 'Taxi' })

  let attempts = 0
  await page.route('**/api/expenses?*', async (route) => {
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
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('heading', { name: 'Taxi' })).toBeVisible()
})

test('a save that fails offline is explained and can be repeated', async ({ page }) => {
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

test('an Expense that is not the User\'s, or does not exist, is not found', async ({ page, browser }) => {
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
  await page.getByRole('link', { name: 'Editar Cena, $100.00' }).click()
  await expect(page.getByLabel('Cuenta')).toHaveValue(String(account.id))
  await expect(page.getByText('Esta Cuenta está archivada.')).toBeVisible()
  await page.getByLabel('Monto').fill('60')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toContainText('Saldo de Cuenta vieja: $240.00.')

  await page.getByRole('link', { name: 'Eliminar Cena, $60.00' }).click()
  await page.getByRole('button', { name: 'Eliminar gasto' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText('Saldo de Cuenta vieja: $300.00.')
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
  await page.getByRole('button', { name: 'Mostrar más' }).click()
  await expect(page.getByText('Mostrando 51 de 51 gastos.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostrar más' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'mar 10 nov' })).toBeVisible()
  expect(await noOverflow(page)).toBe(true)
})
