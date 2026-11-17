import type { Page } from '@playwright/test'
import { createAccount, createExpense, createIncome, savePreferences } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())
const thisMonth = () => panamaToday().slice(0, 7)

function previousMonth() {
  const total = Number(thisMonth().slice(0, 4)) * 12 + Number(thisMonth().slice(5, 7)) - 2
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const rows = (page: Page) => page.getByRole('main').getByRole('listitem')
const card = (page: Page, name: string) => page.getByRole('region', { name })

/** A spending Account with an Expense this month, an Income this month and an older Expense. */
async function seedRecords(page: Page) {
  const account = await createAccount(page.request, { name: 'Corriente', opening_balance: '1000.00' })
  await createExpense(page.request, { account_id: account.id, amount: '12.00', description: 'Café de hoy' })
  await createIncome(page.request, { account_id: account.id, amount: '200.00', description: 'Sueldo del mes' })
  await createExpense(page.request, {
    account_id: account.id,
    amount: '30.00',
    date: `${previousMonth()}-10`,
    description: 'Gasto antiguo',
  })
  return account
}

async function openSettings(page: Page, width: number) {
  await page.goto(width < 1024 ? '/menu' : '/dashboard')
  await page.getByRole('link', { name: 'Preferencias' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Preferencias' })).toBeVisible()
}

for (const viewport of VIEWPORTS) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${viewport.name} in ${colorScheme}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height }, colorScheme })

      test('preferences are reached from the profile links, saved, kept and applied to Movements and the Panel', async ({
        page,
      }) => {
        await signUp(page.request)
        await seedRecords(page)

        // Initially: every type, the current month and every section.
        await page.goto('/movements')
        await expect(rows(page)).toHaveCount(2)
        await expect(page.getByLabel('Desde', { exact: true })).toHaveValue(`${thisMonth()}-01`)

        await openSettings(page, viewport.width)
        await expect(page.getByLabel('Tipo')).toHaveValue('')
        await expect(page.getByLabel('Período')).toHaveValue('current_month')
        await expect(page.getByLabel('Agrupar por')).toHaveValue('date')
        await expect(page.getByLabel('Cuentas', { exact: true })).toBeChecked()
        await expectScreenQuality(page, `settings-initial-${viewport.name}-${colorScheme}`)

        // A custom period asks for its days; a reversed one is explained.
        await page.getByLabel('Período').selectOption('custom')
        await page.getByRole('button', { name: 'Guardar preferencias' }).click()
        await expect(page.getByText('Escribe desde cuándo, hasta cuándo, o ambas fechas.')).toBeVisible()
        await page.getByLabel('Desde', { exact: true }).fill('2026-11-05')
        await page.getByLabel('Hasta', { exact: true }).fill('2026-11-01')
        await page.getByRole('button', { name: 'Guardar preferencias' }).click()
        await expect(page.getByText('El período no puede terminar antes de empezar.')).toBeVisible()
        await expectScreenQuality(page, `settings-invalid-${viewport.name}-${colorScheme}`)

        // Save: all time, grouped by type, without the Accounts card.
        await page.getByLabel('Período').selectOption('all')
        await page.getByLabel('Agrupar por').selectOption('type')
        await page.getByLabel('Cuentas', { exact: true }).uncheck()
        await page.getByRole('button', { name: 'Guardar preferencias' }).click()
        await expect(page.getByText('Preferencias guardadas.')).toBeVisible()
        await expectScreenQuality(page, `settings-saved-${viewport.name}-${colorScheme}`)

        // They survive closing the session and opening it again.
        await page.reload()
        await expect(page.getByLabel('Período')).toHaveValue('all')
        await expect(page.getByLabel('Agrupar por')).toHaveValue('type')
        await expect(page.getByLabel('Cuentas', { exact: true })).not.toBeChecked()

        // Movements opens as chosen, and the address overrides the preferences.
        await page.goto('/movements')
        await expect(rows(page)).toHaveCount(3)
        await expect(page.getByRole('heading', { name: 'Gastos' })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Ingresos' })).toBeVisible()
        await expectScreenQuality(page, `settings-movements-by-type-${viewport.name}-${colorScheme}`)
        await page.goto('/movements?type=income')
        await expect(rows(page)).toHaveCount(1)
        await page.getByRole('button', { name: 'Quitar filtros' }).click()
        await expect(rows(page)).toHaveCount(3)

        // Hiding a section changes only what the Panel shows, never its figures.
        await page.goto('/dashboard')
        await expect(card(page, 'Disponible hasta fin de mes')).toContainText('$1,158.00')
        await expect(card(page, 'Patrimonio')).toBeVisible()
        await expect(card(page, 'Cuentas')).toHaveCount(0)
        await expectScreenQuality(page, `settings-panel-${viewport.name}-${colorScheme}`)
      })
    })
  }
}

test('the current month is relative to the day the view is opened', async ({ page }) => {
  await signUp(page.request)
  await seedRecords(page)
  await page.clock.setFixedTime(new Date(`${thisMonth()}-15T18:00:00Z`))

  await page.goto('/movements')
  await expect(page.getByLabel('Desde', { exact: true })).toHaveValue(`${thisMonth()}-01`)
  await expect(rows(page)).toHaveCount(2)

  await page.clock.setFixedTime(new Date(`${previousMonth()}-15T18:00:00Z`))
  await page.goto('/movements')
  await expect(page.getByLabel('Desde', { exact: true })).toHaveValue(`${previousMonth()}-01`)
  await expect(page.getByLabel('Hasta', { exact: true })).toHaveValue(new RegExp(`^${previousMonth()}-(28|29|30|31)$`))
  await expect(rows(page)).toHaveCount(1)
  await expect(page.getByRole('link', { name: /^Gasto antiguo/ })).toBeVisible()
})

test('a User with no records this month is told so and can still see older ones', async ({ page }) => {
  await signUp(page.request)
  await page.goto('/movements')
  await expect(page.getByRole('heading', { name: 'Aún no hay movimientos este mes' })).toBeVisible()
  await expectScreenQuality(page, 'settings-empty-month')
})

test('preferences belong to each User and an Account of someone else is refused', async ({ page, browser }) => {
  await signUp(page.request)
  const own = await seedRecords(page)
  await savePreferences(page.request, { movement_type: 'income', account_id: own.id, grouping: 'type' })

  const stranger = await browser.newContext()
  const strangerPage = await stranger.newPage()
  await signUp(strangerPage.request)
  expect(await (await strangerPage.request.get('/api/settings/preferences')).json()).toMatchObject({
    movement_type: null,
    account_id: null,
    grouping: 'date',
  })

  // Neither the Account of the first User nor a malformed value gets saved.
  const token = (await (await strangerPage.request.get('/auth/session')).json()).csrf_token as string
  const put = (data: unknown) =>
    strangerPage.request.put('/api/settings/preferences', { data, headers: { 'X-CSRFToken': token } })
  const valid = {
    movement_type: null,
    account_id: own.id,
    period: 'all',
    from: null,
    to: null,
    grouping: 'date',
    visible_sections: ['available'],
  }
  expect((await put(valid)).status()).toBe(400)
  expect((await put({ ...valid, account_id: null, grouping: 'month' })).status()).toBe(400)
  expect((await put({ ...valid, account_id: null, visible_sections: ['secret'] })).status()).toBe(400)
  expect((await strangerPage.request.get('/api/settings/preferences')).status()).toBe(200)
  await stranger.close()

  await page.goto('/settings')
  await expect(page.getByLabel('Tipo')).toHaveValue('income')
  await expect(page.getByLabel('Cuenta', { exact: true })).toHaveValue(String(own.id))
})

test('deleting the User erases the preferences with them', async ({ page }) => {
  const email = await signUp(page.request)
  await savePreferences(page.request, { grouping: 'type', visible_sections: ['available'] })

  const session = await (await page.request.get('/auth/session')).json()
  const erased = await page.request.delete('/users/me', {
    data: { password: 'correct-horse-battery' },
    headers: { 'X-CSRFToken': session.csrf_token },
  })
  expect(erased.status()).toBe(204)

  // The same email registers again, and starts from the initial preferences.
  await signUp(page.request, email)
  expect(await (await page.request.get('/api/settings/preferences')).json()).toMatchObject({
    grouping: 'date',
    visible_sections: ['available', 'budgets', 'net_worth', 'upcoming', 'accounts'],
  })
})
