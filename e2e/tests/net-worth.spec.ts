import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { createAccount, createIncome, findAsset, recordTrade, setReferencePrice } from './support/ledger.js'
import { signUp } from './support/session.js'

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

function monthsAgo(count: number) {
  const today = panamaToday()
  const total = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1 - count
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const card = (page: Page) => page.getByRole('region', { name: 'Patrimonio' })

/**
 * Two months ago a Cuenta corriente of $1,000 and a Cuenta de inversión of $500 start (opening
 * balances, $1,500 incorporated). Last month: Income $200 and a purchase of 5 units at $40, with no
 * price of its own yet (an estimate). This month: a manual price of $50 from the first day.
 * Patrimonio now: 1,200 + 300 + 250 = $1,750; Rendimiento of the month $50; Ahorro neto $0.
 */
async function seedEvolution(page: Page) {
  const checking = await createAccount(page.request, { opening_balance: '1000.00', opening_date: `${monthsAgo(2)}-01` })
  const broker = await createAccount(page.request, {
    name: 'Bróker',
    type: 'investment',
    opening_balance: '500.00',
    opening_date: `${monthsAgo(2)}-01`,
  })
  await createIncome(page.request, { account_id: checking.id, amount: '200.00', date: `${monthsAgo(1)}-05`, description: 'Sueldo' })
  const asset = await findAsset(page.request, 'aapl')
  await recordTrade(page.request, 'buy', {
    account_id: broker.id,
    asset_id: asset.id,
    units: '5',
    unit_price: '40',
    date: `${monthsAgo(1)}-10`,
  })
  await setReferencePrice(page.request, asset.id, '50', `${monthsAgo(0)}-01`)
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the Panel splits the month's change and shows the evolution as a chart and a table in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    await seedEvolution(page)

    await page.goto('/dashboard')

    await expect(card(page)).toContainText('$1,750.00')
    await expect(card(page)).toContainText('Rendimiento del período+$50.00')
    await expect(card(page)).toContainText('Ahorro neto$0.00')
    await expect(card(page).getByText('Saldos iniciales incorporados')).toBeHidden()

    const chart = card(page).getByRole('img', { name: /Evolución mensual del Patrimonio/ })
    await expect(chart).toBeVisible()
    await expect(card(page)).toContainText('Punto vacío: algún precio de ese mes es estimado.')
    await expectScreenQuality(page, `net-worth-chart-${colorScheme}`)

    await card(page).getByRole('button', { name: 'Tabla' }).click()
    const table = card(page).getByRole('table')
    await expect(table.getByRole('row')).toHaveCount(4)
    const current = table.getByRole('row').nth(1)
    await expect(current).toContainText('$1,750.00')
    await expect(current).toContainText('+$50.00')
    const lastMonth = table.getByRole('row').nth(2)
    await expect(lastMonth).toContainText('(estimado)')
    await expect(lastMonth).toContainText('$1,700.00')
    await expect(lastMonth).toContainText('$200.00')
    const firstMonth = table.getByRole('row').nth(3)
    await expect(firstMonth).toContainText('+$1,500.00')
    await expectScreenQuality(page, `net-worth-table-${colorScheme}`)
  })
}

test('an Account that starts this month is shown apart and never called savings or return', async ({ page }) => {
  await signUp(page.request)
  await createAccount(page.request, { opening_balance: '800.00', opening_date: `${monthsAgo(0)}-01` })

  await page.goto('/dashboard')

  await expect(card(page)).toContainText('Saldos iniciales incorporados+$800.00')
  await expect(card(page)).toContainText('no es ahorro ni ganancia')
  await expect(card(page)).toContainText('Ahorro neto$0.00')
  await expect(card(page)).toContainText('Rendimiento del período$0.00')
})
