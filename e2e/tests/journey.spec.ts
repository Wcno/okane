import type { Page } from '@playwright/test'
import { createAccount, createBudget, createRecurringPayment, createTransfer, findAsset, recordTrade, setReferencePrice } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { PASSWORD, signUp, uniqueEmail } from './support/session.js'

/**
 * The product from the first visit to the last: one User, every area of the app.
 * The feature specs go deep on each screen; this one proves they agree with each
 * other. The date comes from the stack's clock in Panama, the quotes from its
 * sample catalog (QUOTES_PROVIDER=sample), so the figures never depend on the day or the network.
 */

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8000'
const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())
const thisMonth = () => panamaToday().slice(0, 7)

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const card = (page: Page, name: string) => page.getByRole('region', { name })
const rows = (page: Page) => page.getByRole('main').getByRole('listitem')

async function registerExpenseFromPanel(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Registrar gasto' }).click()
  const sheet = page.getByRole('dialog', { name: 'Registrar gasto' })
  await sheet.getByLabel('Monto').fill(amount)
  await sheet.getByText('Alimentación', { exact: true }).click()
  await sheet.getByRole('button', { name: /Registrar gasto/ }).click()
  await expect(sheet).toBeHidden()
}

test('a User walks the whole product and stays alone in it', async ({ page, browser, isMobile }) => {
  forbidBrowserDialogs(page)

  // Sign up in the browser, as a visitor does.
  const email = uniqueEmail()
  await page.goto('/register')
  await expect(page.getByRole('heading', { name: 'Crear tu usuario' })).toBeVisible()
  await expectScreenQuality(page, 'journey-register')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Crear usuario' }).click()
  await expect(page.getByRole('heading', { name: 'Empieza creando tu primera Cuenta' })).toBeVisible()
  await expectScreenQuality(page, 'journey-panel-empty')

  // Accounts.
  await page.goto('/accounts/create')
  await page.getByLabel('Nombre', { exact: true }).fill('Cuenta corriente')
  await page.locator('input[value=spending]').check()
  await page.getByLabel('Saldo inicial', { exact: true }).fill('1000')
  await page.getByLabel('Fecha de inicio del registro').fill(`${thisMonth()}-01`)
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByRole('link', { name: /^Cuenta corriente .*Editar cuenta$/ })).toBeVisible()
  await expectScreenQuality(page, 'journey-accounts')

  // Income and Expense move Disponible.
  await page.goto('/incomes/create')
  await page.getByLabel('Monto').fill('500')
  await page.getByLabel('Descripción').fill('Salario')
  await page.getByRole('main').getByRole('button', { name: 'Registrar ingreso' }).click()
  await expect(page).toHaveURL(/\/incomes$/)

  await page.goto('/dashboard')
  await registerExpenseFromPanel(page, '40')
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$1,460.00')

  // A Budget that the next Expense exceeds.
  await createBudget(page.request, { month: thisMonth(), category: 'food', amount: '100.00' })
  await registerExpenseFromPanel(page, '120')
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$1,340.00')
  await page.goto('/budgets')
  await expect(page.getByRole('listitem').filter({ hasText: 'Alimentación' })).toContainText('Excedida por $60.00')
  await expectScreenQuality(page, 'journey-budget-exceeded')

  // A recurring payment is committed money; a Transfer funds the investment Account.
  const accounts = (await (await page.request.get('/api/accounts')).json()) as { results: { id: number; name: string }[] }
  const checking = accounts.results.find((account) => account.name === 'Cuenta corriente')!
  await createRecurringPayment(page.request, {
    account_id: checking.id,
    start_date: `${thisMonth()}-01`,
    day_of_month: 31,
    amount: '50.00',
    category: 'utilities',
    description: 'Internet',
  })
  const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '0.00', opening_date: `${thisMonth()}-01` })
  await createTransfer(page.request, { source_account_id: checking.id, destination_account_id: broker.id, amount: '600.00' })
  await page.goto('/recurring-payments')
  await expect(page.getByRole('main').getByText('Internet').first()).toBeVisible()
  await expectScreenQuality(page, 'journey-recurring-payments')

  // An investment bought from the catalog, repriced by the User: the Return follows.
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', { account_id: broker.id, asset_id: asset.id, units: '10', unit_price: '50' })
  await setReferencePrice(page.request, asset.id, '62.5')
  await page.goto('/investments/performance')
  const total = card(page, 'Rendimiento acumulado')
  await expect(total).toContainText('$125.00')
  await expect(total).toContainText('Aporte neto')
  await expect(total).toContainText('$600.00')
  await expectScreenQuality(page, 'journey-performance')

  // Panel: 1000 + 500 - 160 spent - 600 moved - 50 committed. Investing leaves the spending Disponible alone.
  await page.goto('/dashboard')
  await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$690.00')
  await expectScreenQuality(page, 'journey-panel')

  // The Account statement lists every movement of the Account, and Movements shows each record once.
  await page.goto('/accounts')
  await page.getByRole('link', { name: /^Cuenta corriente/ }).click()
  await page.getByRole('link', { name: 'Ver estado de cuenta' }).click()
  await expect(rows(page).filter({ hasText: 'Salario' })).toBeVisible()
  await expect(rows(page).filter({ hasText: 'Transferencia' })).toHaveCount(1)
  await expectScreenQuality(page, 'journey-statement')

  await page.goto('/movements')
  await expect(page.getByRole('status').filter({ hasText: 'Mostrando' })).toHaveText('Mostrando 5 de 5 movimientos.')
  await expectScreenQuality(page, 'journey-movements')

  // Preferences are saved, kept after the session is closed and opened again, and theirs alone.
  await page.goto(isMobile ? '/menu' : '/dashboard')
  await page.getByRole('link', { name: 'Preferencias' }).click()
  await page.getByLabel('Agrupar por').selectOption('type')
  await page.getByRole('button', { name: 'Guardar preferencias' }).click()
  await expect(page.getByText('Preferencias guardadas.')).toBeVisible()
  await expectScreenQuality(page, 'journey-preferences')
  await page.goto(isMobile ? '/menu' : '/dashboard')
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.goto('/settings')
  await expect(page.getByLabel('Agrupar por')).toHaveValue('type')

  // A token reads the same data from a script and stops working once revoked.
  await page.goto('/settings/integrations')
  await page.getByLabel('Nombre').fill('Journey')
  await page.getByLabel('Leer datos financieros').check()
  await page.getByRole('button', { name: 'Crear token' }).click()
  const secret = (await page.getByTestId('token-secret').textContent())!
  await expectScreenQuality(page, 'journey-token')
  const asScript = (path: string) => fetch(baseURL + path, { headers: { Authorization: `Bearer ${secret}` } })
  const listed = await asScript('/api/v1/accounts')
  expect(listed.status).toBe(200)
  expect(JSON.stringify(await listed.json())).toContain('Cuenta corriente')
  await page.getByRole('button', { name: 'Revocar token Journey' }).click()
  await page.getByRole('button', { name: 'Sí, revocar Journey' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Journey' })).toContainText('Revocado el')

  // Another User sees none of it, by address or by API, and keeps the initial preferences.
  const stranger = await browser.newContext()
  const strangerPage = await stranger.newPage()
  await signUp(strangerPage.request)
  expect((await strangerPage.request.get(`/api/accounts/${checking.id}`)).status()).toBe(404)
  expect((await strangerPage.request.get(`/api/accounts/${checking.id}/statement`)).status()).toBe(404)
  const strangerAccounts = (await (await strangerPage.request.get('/api/accounts')).json()) as { results: unknown[] }
  expect(strangerAccounts.results).toEqual([])
  await strangerPage.goto(`/accounts/${checking.id}/statement`)
  await expect(strangerPage.getByText('Cuenta corriente')).toHaveCount(0)
  await strangerPage.goto('/settings')
  await expect(strangerPage.getByLabel('Agrupar por')).toHaveValue('date')
  await stranger.close()

  // Deleting the User erases it all.
  await page.goto(isMobile ? '/menu' : '/dashboard')
  await page.getByRole('link', { name: 'Eliminar usuario' }).click()
  await page.getByLabel('Tu contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Eliminar mi usuario' }).click()
  await expect(page.getByRole('heading', { name: 'Eliminaste tu usuario' })).toBeVisible()
  await expectScreenQuality(page, 'journey-deleted')
  expect((await page.request.get('/api/accounts')).status()).toBe(401)
})
