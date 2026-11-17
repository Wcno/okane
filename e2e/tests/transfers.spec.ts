import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, knownAxeRules, test } from './support/qa.js'
import { archiveAccount, createAccount, createTransfer } from './support/ledger.js'
import { signUp } from './support/session.js'

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const submitButton = (page: Page, name = 'Registrar transferencia') =>
  page.getByRole('main').getByRole('button', { name })

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

/** The row of a Transfer in the list: one link to its edit screen. */
const transferRow = (page: Page, title: string) =>
  page.getByRole('link', { name: new RegExp(`^Editar transferencia .*${title}`) })

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

const fitsInViewport = (locator: ReturnType<Page['locator']>, height: number) =>
  locator.evaluate((element, limit) => {
    const box = element.getBoundingClientRect()
    return box.top >= 0 && box.bottom <= limit
  }, height)

for (const colorScheme of ['light', 'dark'] as const) {
  test(`transfers lifecycle in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
    await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '300.00' })

    await page.goto('/transfers')
    await expect(page.getByRole('heading', { name: 'Aún no registras transferencias' })).toBeVisible()
    await expectScreenQuality(page, `transfers-empty-${colorScheme}`)
    await page.getByRole('link', { name: 'Registrar tu primera transferencia' }).click()

    await expect(page).toHaveURL(/\/transfers\/create$/)
    await expect(page.getByLabel('Fecha')).toHaveValue(panamaToday())
    await expect(page.getByLabel('Sale de')).toHaveValue(/\d+/)
    await page.getByLabel('Monto').fill('250')
    await page.getByLabel('Descripción').fill('Ahorro de noviembre')
    await expectScreenQuality(page, `transfers-create-filled-${colorScheme}`)
    await submitButton(page).click()

    await expect(page).toHaveURL(/\/transfers$/)
    await expect(page.getByRole('status').filter({ hasText: 'Registraste' })).toHaveText(
      'Registraste una transferencia de $250.00 de Cuenta corriente a Ahorro. Saldo de Cuenta corriente: $750.00. Saldo de Ahorro: $550.00.',
    )
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
    await expect(transferRow(page, 'Ahorro de noviembre')).toBeVisible()
    await expectScreenQuality(page, `transfers-list-${colorScheme}`, { skipAxeRules: knownAxeRules.recordRowLabel })

    // The list keeps its create action once it has records.
    await page.getByRole('link', { name: 'Registrar transferencia' }).click()
    await expect(page).toHaveURL(/\/transfers\/create$/)
    await page.goBack()
    await expect(transferRow(page, 'Ahorro de noviembre')).toBeVisible()

    // Correcting the amount moves both Balances; the total of the Balances never changes.
    await transferRow(page, 'Ahorro de noviembre').click()
    await expect(page.getByLabel('Monto')).toHaveValue('250.00')
    await page.getByLabel('Monto').fill('100')
    await expectScreenQuality(page, `transfers-edit-${colorScheme}`)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
      'Guardaste una transferencia de $100.00 de Cuenta corriente a Ahorro. Saldo de Cuenta corriente: $900.00. Saldo de Ahorro: $400.00.',
    )
    await page.goto('/accounts')
    await expect(accountRow(page, 'Cuenta corriente')).toContainText('$900.00')
    await expect(accountRow(page, 'Ahorro')).toContainText('$400.00')

    await page.goto('/transfers')
    await transferRow(page, 'Ahorro de noviembre').click()
    await page.getByRole('link', { name: 'Eliminar esta transferencia' }).click()
    await expect(page).toHaveURL(/\/transfers\/\d+\/delete$/)
    await expect(
      page.getByText('El Saldo de Cuenta corriente subirá $100.00 y el de Ahorro bajará $100.00.'),
    ).toBeVisible()
    await expectScreenQuality(page, `transfers-delete-${colorScheme}`)
    await page.getByRole('button', { name: 'Eliminar transferencia' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText(
      'Saldo de Cuenta corriente: $1,000.00. Saldo de Ahorro: $300.00.',
    )
    await expect(page.getByRole('heading', { name: 'Aún no registras transferencias' })).toBeVisible()
  })
}

test('a Transfer into an investment Account is an Aporte', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
  await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '0.00' })

  await page.goto('/transfers/create')
  await page.getByLabel('Llega a').selectOption({ label: 'Bróker · Inversión' })
  await expect(page.getByText('Una transferencia a una Cuenta de inversión es un Aporte.')).toBeVisible()
  await page.getByLabel('Monto').fill('400')
  await expectScreenQuality(page, 'transfers-create-contribution')
  await submitButton(page).click()

  await expect(page.getByRole('status').filter({ hasText: 'Registraste' })).toContainText(
    'Registraste un aporte de $400.00 de Cuenta corriente a Bróker.',
  )
  await expect(transferRow(page, 'de Cuenta corriente a Bróker')).toContainText('Aporte')
  await expectScreenQuality(page, 'transfers-list-contribution', { skipAxeRules: knownAxeRules.recordRowLabel })
})

test('registering shows what is wrong, keeps the typed values and clears each error on change', async ({
  page,
}) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await createAccount(page.request, { name: 'Cuenta corriente', opening_date: '2026-11-10' })
  await createAccount(page.request, { name: 'Ahorro', type: 'savings' })

  await page.goto('/transfers/create')
  await submitButton(page).click()
  await expect(page.getByText('Escribe un monto mayor que cero')).toBeVisible()
  await expect(page.getByLabel('Monto')).toBeFocused()
  await expectScreenQuality(page, 'transfers-create-errors')
  await page.getByLabel('Monto').fill('8')
  await expect(page.getByLabel('Monto')).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByText('Escribe un monto mayor que cero')).toHaveCount(0)

  // The same Account on both sides.
  await page.getByLabel('Llega a').selectOption({ label: 'Cuenta corriente · Gastos' })
  await page.getByLabel('Fecha').fill('2999-01-01')
  await submitButton(page).click()
  await expect(page.getByText('El origen y el destino deben ser Cuentas distintas.')).toBeVisible()
  await expect(page.getByText('La fecha no puede ser futura')).toBeVisible()
  await expect(page.getByLabel('Llega a')).toBeFocused()
  await expect(page.getByLabel('Monto')).toHaveValue('8')

  await page.getByLabel('Llega a').selectOption({ label: 'Ahorro · Ahorro' })
  await expect(page.getByLabel('Llega a')).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByText('El origen y el destino deben ser Cuentas distintas.')).toHaveCount(0)
  await page.getByLabel('Fecha').fill('2026-11-01')
  await submitButton(page).click()
  await expect(page.getByText(/anterior al inicio del registro de la Cuenta Cuenta corriente/)).toBeVisible()
  await page.getByLabel('Fecha').fill(panamaToday())
  await expect(page.getByLabel('Fecha')).toHaveAttribute('aria-invalid', 'false')
  await submitButton(page).click()
  await expect(page).toHaveURL(/\/transfers$/)
})

test('an Account archived while the form is open is refused by api-service and the draft stays', async ({
  page,
  expectedProblems,
}) => {
  // The 400 api-service answers on purpose.
  expectedProblems.push('status of 400')
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const old = await createAccount(page.request, { name: 'Cuenta vieja' })
  const live = await createAccount(page.request, { name: 'Cuenta nueva' })
  await createTransfer(page.request, { source_account_id: old.id, destination_account_id: live.id })

  await page.goto('/transfers/create')
  await page.getByLabel('Sale de').selectOption({ label: 'Cuenta vieja · Gastos' })
  await page.getByLabel('Llega a').selectOption({ label: 'Cuenta nueva · Gastos' })
  await archiveAccount(page.request, old.id)
  await page.getByLabel('Monto').fill('7.25')
  await submitButton(page).click()

  await expect(page.getByText('Esta Cuenta está archivada y no admite registros nuevos')).toBeVisible()
  await expect(page.getByLabel('Monto')).toHaveValue('7.25')
  await expect(page.getByLabel('Sale de')).toBeFocused()
  await expectScreenQuality(page, 'transfers-create-refused')
})

test('a Transfer touching an Account archived since can still be corrected and deleted', async ({ page }) => {
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const old = await createAccount(page.request, { name: 'Cuenta vieja', opening_balance: '300.00' })
  const live = await createAccount(page.request, { name: 'Cuenta nueva', opening_balance: '0.00' })
  await createTransfer(page.request, {
    source_account_id: old.id,
    destination_account_id: live.id,
    amount: '100.00',
    description: 'Mudanza',
  })
  await archiveAccount(page.request, old.id)

  await page.goto('/transfers')
  await transferRow(page, 'Mudanza').click()
  await expect(page.getByLabel('Sale de')).toHaveValue(String(old.id))
  await expect(page.getByText('Una de estas Cuentas está archivada.')).toBeVisible()
  await expectScreenQuality(page, 'transfers-edit-archived')
  await page.getByLabel('Monto').fill('60')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toContainText(
    'Saldo de Cuenta vieja: $240.00. Saldo de Cuenta nueva: $60.00.',
  )

  await transferRow(page, 'Mudanza').click()
  await page.getByRole('link', { name: 'Eliminar esta transferencia' }).click()
  await page.getByRole('button', { name: 'Eliminar transferencia' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText(
    'Saldo de Cuenta vieja: $300.00. Saldo de Cuenta nueva: $0.00.',
  )
})

test('with fewer than two Accounts the screens say what to do first', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { name: 'Única' })

  await page.goto('/transfers')
  await expect(page.getByRole('link', { name: 'Crear una cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'transfers-empty-needs-accounts')
  await page.goto('/transfers/create')
  await expect(page.getByRole('heading', { name: 'Primero necesitas dos Cuentas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'transfers-create-needs-accounts')
})

test('the list shows loading, explains a failure and recovers on retry', async ({ page, expectedProblems }) => {
  // The request the test aborts on purpose.
  expectedProblems.push('request failed: GET', 'net::ERR_FAILED')
  await signUp(page.request)
  const source = await createAccount(page.request, { name: 'Origen' })
  const destination = await createAccount(page.request, { name: 'Destino' })
  await createTransfer(page.request, {
    source_account_id: source.id,
    destination_account_id: destination.id,
    description: 'Renta',
  })

  let attempts = 0
  await page.route('**/api/transfers?*', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      await route.abort('failed')
    } else {
      await route.continue()
    }
  })
  await page.goto('/transfers')

  await expect(page.getByText('Cargando tus transferencias…')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar con Okane')
  await expectScreenQuality(page, 'transfers-list-failed')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(transferRow(page, 'Renta')).toBeVisible()
  await expectScreenQuality(page, 'transfers-list-recovered', { skipAxeRules: knownAxeRules.recordRowLabel })
})

test('a save that fails offline is explained and can be repeated', async ({ page, expectedProblems }) => {
  // The request the test aborts on purpose.
  expectedProblems.push('request failed: POST', 'net::ERR_FAILED')
  await signUp(page.request)
  await createAccount(page.request, { name: 'Origen' })
  await createAccount(page.request, { name: 'Destino' })
  await page.goto('/transfers/create')
  await page.getByLabel('Monto').fill('9.99')

  await page.route('**/api/transfers', (route) => route.abort('failed'))
  await submitButton(page).click()
  await expect(page.getByRole('alert')).toContainText('No pudimos conectar con Okane')
  await expect(page.getByLabel('Monto')).toHaveValue('9.99')
  await expectScreenQuality(page, 'transfers-create-offline')

  await page.unroute('**/api/transfers')
  await submitButton(page).click()
  await expect(page).toHaveURL(/\/transfers$/)
})

test("a Transfer that is not the User's, or does not exist, is not found", async ({ page, browser, expectedProblems }) => {
  // The 404 of an id that is not the User's or does not exist.
  expectedProblems.push('status of 404')
  await signUp(page.request)
  const other = await browser.newContext()
  await signUp(other.request)
  const theirs = await createTransfer(other.request, {
    source_account_id: (await createAccount(other.request, { name: 'A' })).id,
    destination_account_id: (await createAccount(other.request, { name: 'B' })).id,
  })
  await other.close()

  for (const id of [String(theirs.id), '999999', 'abc']) {
    for (const action of ['edit', 'delete']) {
      await page.goto(`/transfers/${id}/${action}`)
      await expect(page.getByRole('heading', { name: 'No encontramos esta transferencia' })).toBeVisible()
      if (id === '999999' && action === 'edit') await expectScreenQuality(page, 'transfers-not-found')
    }
  }
})

test('the list shows the next page on request and keeps day headings', async ({ page }) => {
  await signUp(page.request)
  const source = await createAccount(page.request, { name: 'Origen', opening_balance: '5000.00' })
  const destination = await createAccount(page.request, { name: 'Destino' })
  for (let index = 0; index < 51; index += 1) {
    await createTransfer(page.request, {
      source_account_id: source.id,
      destination_account_id: destination.id,
      amount: '1.00',
      description: `Mov ${String(index + 1).padStart(2, '0')}`,
      date: index < 3 ? '2026-11-10' : undefined,
    })
  }

  await page.goto('/transfers')
  await expect(page.getByText('Mostrando 50 de 51 transferencias.')).toBeVisible()
  const more = page.getByRole('button', { name: 'Mostrar más' })
  await more.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Mostrando 51 de 51 transferencias.')).toBeVisible()
  // The button is gone: the keyboard moves to the first row that arrived instead of falling to the page.
  await expect(page.locator('a[id^=transfer-]').nth(50)).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'mar 10 nov' })).toBeVisible()
  await expectScreenQuality(page, 'transfers-list-all-pages', { skipAxeRules: knownAxeRules.recordRowLabel })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the main action is visible without scrolling and every control is at least 44px tall', async ({ page }) => {
    await signUp(page.request)
    const source = await createAccount(page.request, { name: 'Cuenta corriente del hogar' })
    const destination = await createAccount(page.request, { name: 'Ahorro', type: 'savings' })
    await createTransfer(page.request, {
      source_account_id: source.id,
      destination_account_id: destination.id,
      amount: '1234.50',
      description: 'Ahorro de la quincena larga',
    })

    await page.goto('/transfers/create')
    await expect(page.getByLabel('Monto')).toBeVisible()
    expect(await fitsInViewport(submitButton(page), 844)).toBe(true)
    await page.getByLabel('Llega a').selectOption({ label: 'Ahorro · Ahorro' })
    await page.getByLabel('Monto').fill('15')
    await submitButton(page).click()
    await expect(page).toHaveURL(/\/transfers$/)

    // A row is one link with the whole description and route, and nothing else to tap.
    const row = transferRow(page, 'Ahorro de la quincena larga')
    await expect(row).toContainText('Cuenta corriente del hogar → Ahorro')
    await expect(row).toHaveAttribute('aria-label', /^Editar transferencia de Cuenta corriente del hogar a Ahorro, \$1,234\.50/)
    expect((await row.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    const clipped = await row.evaluate((link) =>
      [...link.querySelectorAll('span')].some((span) => span.scrollWidth > span.clientWidth + 1),
    )
    expect(clipped).toBe(false)
    expect((await page.getByRole('link', { name: 'Registrar transferencia' }).boundingBox())?.height).toBeGreaterThanOrEqual(44)
    expect(await noOverflow(page)).toBe(true)

    await row.click()
    expect(await fitsInViewport(page.getByRole('button', { name: 'Guardar cambios' }), 844)).toBe(true)
    const remove = page.getByRole('link', { name: 'Eliminar esta transferencia' })
    expect((await remove.boundingBox())?.height).toBeGreaterThanOrEqual(44)
    for (const label of ['Sale de', 'Llega a', 'Fecha', 'Descripción']) {
      expect((await page.getByLabel(label).boundingBox())?.height).toBeGreaterThanOrEqual(44)
    }
    await remove.click()
    await expect(page).toHaveURL(/\/transfers\/\d+\/delete$/)
    expect(await fitsInViewport(page.getByRole('button', { name: 'Eliminar transferencia' }), 844)).toBe(true)
  })
})
