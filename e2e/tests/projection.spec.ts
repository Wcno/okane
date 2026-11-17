import type { Locator, Page } from '@playwright/test'
import { createAccount, findAsset, recordTrade } from './support/ledger.js'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { signUp } from './support/session.js'

const main = (page: Page) => page.getByRole('main')
const scenario = (page: Page, position: number) => page.getByRole('group', { name: `Escenario ${position}`, exact: true })

async function fill(group: Locator, values: { capital?: string; contribution?: string; months?: string; rate?: string }) {
  if (values.capital !== undefined) await group.getByLabel('Capital inicial').fill(values.capital)
  if (values.contribution !== undefined) await group.getByLabel('Aporte mensual').fill(values.contribution)
  if (values.months !== undefined) await group.getByLabel('Plazo en meses').fill(values.months)
  if (values.rate !== undefined) await group.getByLabel('Tasa anual (%)').fill(values.rate)
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`savings and investment scenarios compare without changing anything in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)

    await page.goto('/investments/projection')
    await expect(page.getByRole('heading', { name: 'Aún no tienes una Cuenta para proyectar' })).toBeVisible()
    await expectScreenQuality(page, `projection-empty-${colorScheme}`)

    const savings = await createAccount(page.request, {
      name: 'Colchón',
      type: 'savings',
      opening_balance: '1000.00',
      annual_interest_rate: '0.0425',
    })

    // The savings entry starts from the savings Account with its Balance and the day it is from.
    await page.goto('/savings/projection')
    await expect(page.getByRole('heading', { name: 'Proyección' })).toBeVisible()
    await expect(page.getByLabel('Qué proyectar')).toHaveValue(`account:${savings.id}`)
    const start = page.getByRole('region', { name: 'Punto de partida' })
    await expect(start).toContainText('$1,000.00')
    await expect(start).toContainText('Es el Saldo de la Cuenta al')
    const first = scenario(page, 1)
    await expect(first.getByLabel('Aporte mensual')).toHaveValue('0')
    await expect(first.getByLabel('Plazo en meses')).toHaveValue('12')
    await expect(first.getByLabel('Tasa anual (%)')).toHaveValue('0')
    await expect(page.getByRole('region', { name: 'Escenario 1: 12 meses' })).toContainText('$1,000.00')
    await expectScreenQuality(page, `projection-defaults-${colorScheme}`)

    // The spec's example: $1,000 at 12% for one month with $100 at the close ends in $1,110.
    await fill(first, { contribution: '100', months: '1', rate: '12' })
    await main(page).getByRole('button', { name: 'Proyectar' }).click()
    const result = page.getByRole('region', { name: 'Escenario 1: 1 mes' })
    await expect(result).toContainText('$1,100.00')
    await expect(result).toContainText('$1,110.00')
    await expect(result).toContainText('+$10.00')
    await expect(result).toContainText('Ganancia')

    // The saved rate is offered, and used only when the User picks it.
    await expect(first.getByLabel('Tasa anual (%)')).toHaveValue('12')
    await first.getByRole('button', { name: 'Usar tasa guardada (4.25 %)' }).click()
    await expect(first.getByLabel('Tasa anual (%)')).toHaveValue('4.25')

    // A second scenario compares beside the first; the chart and the table show both.
    await main(page).getByRole('button', { name: 'Agregar escenario' }).click()
    const second = scenario(page, 2)
    await fill(second, { capital: '500', contribution: '50', months: '6', rate: '0' })
    await first.getByLabel('Tasa anual (%)').fill('12')
    await main(page).getByRole('button', { name: 'Proyectar' }).click()
    await expect(page.getByRole('region', { name: 'Escenario 2: 6 meses' })).toContainText('$800.00')
    const evolution = page.getByRole('region', { name: 'Evolución mensual' })
    await expect(evolution.getByRole('img')).toBeVisible()
    await evolution.getByText('Ver la tabla mensual').click()
    await expect(evolution.getByRole('table')).toContainText('$1,110.00')
    // The table scrolls inside its card and keeps the month column in view.
    const tableBox = evolution.getByRole('region', { name: 'Tabla mensual de la proyección' })
    await tableBox.evaluate((element) => (element.scrollLeft = element.scrollWidth))
    await expect(evolution.getByRole('columnheader', { name: 'Mes' })).toBeInViewport()
    await tableBox.evaluate((element) => (element.scrollLeft = 0))
    await expectScreenQuality(page, `projection-two-scenarios-${colorScheme}`)

    // Savings take no negative rate: the screen says so and nothing is calculated.
    await fill(second, { rate: '-1' })
    await main(page).getByRole('button', { name: 'Proyectar' }).click()
    await expect(second).toContainText('La tasa de una Cuenta de ahorro es cero o mayor.')
    await expectScreenQuality(page, `projection-rate-error-${colorScheme}`)

    // Nothing was recorded: the Balance of the Account is the one it had.
    await page.goto('/accounts')
    await expect(main(page)).toContainText('$1,000.00')
    await expect(main(page)).not.toContainText('$1,110.00')
  })

  test(`the investment entry projects the portfolio and accepts a loss in ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const broker = await createAccount(page.request, { name: 'Bróker', type: 'investment', opening_balance: '1000.00' })
    const asset = await findAsset(page.request, 'aapl')
    await recordTrade(page.request, 'buy', { account_id: broker.id, asset_id: asset.id, units: '10', unit_price: '50' })

    await page.goto('/investments/projection')
    await expect(page.getByLabel('Qué proyectar')).toHaveValue('portfolio')
    // Both entries keep the Proyección item of the sidebar highlighted; a phone has no sidebar.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Proyección' })).toHaveAttribute('aria-current', 'page')
    }
    // The main action is on screen without scrolling, even at 390px.
    await expect(main(page).getByRole('button', { name: 'Proyectar' })).toBeInViewport()
    const start = page.getByRole('region', { name: 'Punto de partida' })
    await expect(start).toContainText('$1,000.00')
    await expect(start).toContainText('Posiciones, valoradas con tus Precios de referencia')
    await expect(start).toContainText('Algunos precios son estimados')

    const first = scenario(page, 1)
    await fill(first, { capital: '1000', contribution: '100', months: '1', rate: '-12' })
    await main(page).getByRole('button', { name: 'Proyectar' }).click()
    const result = page.getByRole('region', { name: 'Escenario 1: 1 mes' })
    await expect(result).toContainText('$1,090.00')
    await expect(result).toContainText('−$10.00')
    await expect(result).toContainText('Pérdida')
    await expectScreenQuality(page, `projection-loss-${colorScheme}`)

    // The limit of an investment is -1200%; the screen refuses it before asking.
    await fill(first, { rate: '-1200' })
    await main(page).getByRole('button', { name: 'Proyectar' }).click()
    await expect(first).toContainText('Una inversión admite una tasa mayor que -1200 % anual.')
  })
}
