import { expect, test, type Page } from '@playwright/test'
import { archiveAccount, createAccount, createIncome } from './support/ledger.js'
import { signUp } from './support/session.js'

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const submitButton = (page: Page) => page.getByRole('main').getByRole('button', { name: 'Registrar ingreso' })

const accountRow = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })

/** The row of an Income in the list: one link to its edit screen. */
const incomeRow = (page: Page, title: string) => page.getByRole('link', { name: new RegExp(`^Editar ingreso ${title},`) })

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

/** Touch targets are checked on the phone; a pointer on a desktop gets the smaller controls. */
const isPhone = (width: number) => width === 390

const heightOf = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())?.height ?? 0

for (const width of [390, 1440]) {
  test.describe(`at ${width}px`, () => {
    const height = width === 390 ? 844 : 900
    test.use({ viewport: { width, height } })

    for (const colorScheme of ['light', 'dark'] as const) {
      test(`incomes lifecycle in ${colorScheme}`, async ({ page }) => {
        forbidBrowserDialogs(page)
        await page.emulateMedia({ colorScheme })
        await signUp(page.request)
        await createAccount(page.request, { name: 'Cuenta corriente', opening_balance: '1000.00' })
        await createAccount(page.request, { name: 'Ahorro', type: 'savings', opening_balance: '500.00' })

        await page.goto('/incomes')
        await expect(page.getByRole('heading', { name: 'Aún no registras ingresos' })).toBeVisible()
        expect(await noOverflow(page)).toBe(true)
        await page.getByRole('link', { name: 'Registrar tu primer ingreso' }).click()

        await expect(page).toHaveURL(/\/incomes\/create$/)
        await expect(page.getByLabel('Fecha')).toHaveValue(panamaToday())
        // An Income has no Category.
        await expect(page.getByText('Categoría')).toHaveCount(0)
        await page.getByLabel('Monto').fill('250')
        await page.getByLabel('Descripción').fill('Salario')
        expect(await noOverflow(page)).toBe(true)
        await submitButton(page).click()

        await expect(page).toHaveURL(/\/incomes$/)
        await expect(page.getByRole('status').filter({ hasText: 'Registraste' })).toHaveText(
          'Registraste un ingreso de $250.00. Saldo de Cuenta corriente: $1,250.00.',
        )
        await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
        await expect(incomeRow(page, 'Salario')).toBeVisible()
        expect(await noOverflow(page)).toBe(true)

        // Correcting the amount and moving the Income to another Account updates both Balances.
        await incomeRow(page, 'Salario').click()
        await expect(page.getByLabel('Monto')).toHaveValue('250.00')
        await page.getByLabel('Monto').fill('100')
        await page.getByLabel('Cuenta', { exact: true }).selectOption({ label: 'Ahorro' })
        expect(await noOverflow(page)).toBe(true)
        await page.getByRole('button', { name: 'Guardar cambios' }).click()
        await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toHaveText(
          'Guardaste un ingreso de $100.00. Saldo de Ahorro: $600.00.',
        )
        await page.goto('/accounts')
        await expect(accountRow(page, 'Cuenta corriente')).toContainText('$1,000.00')
        await expect(accountRow(page, 'Ahorro')).toContainText('$600.00')

        await page.goto('/incomes')
        await incomeRow(page, 'Salario').click()
        await page.getByRole('link', { name: 'Eliminar este ingreso' }).click()
        await expect(page).toHaveURL(/\/incomes\/\d+\/delete$/)
        await expect(page.getByText('El Saldo de Ahorro bajará $100.00.')).toBeVisible()
        expect(await noOverflow(page)).toBe(true)
        await page.getByRole('button', { name: 'Eliminar ingreso' }).click()

        await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toHaveText(
          'Eliminaste un ingreso de $100.00. Saldo de Ahorro: $500.00.',
        )
        await expect(page.getByRole('heading', { name: 'Aún no registras ingresos' })).toBeVisible()
      })
    }

    test('registering shows what is wrong, clears each error on change and keeps what was typed', async ({ page }) => {
      forbidBrowserDialogs(page)
      await signUp(page.request)
      await createAccount(page.request, { opening_date: '2026-11-10' })
      await page.goto('/incomes/create')

      await submitButton(page).click()
      await expect(page.getByLabel('Monto')).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByText('Escribe un monto mayor que cero')).toBeVisible()
      await expect(page.getByLabel('Monto')).toBeFocused()
      await page.getByLabel('Monto').fill('1000000000000')
      await expect(page.getByLabel('Monto')).toHaveAttribute('aria-invalid', 'false')
      await expect(page.getByText('Escribe un monto mayor que cero')).toHaveCount(0)

      await submitButton(page).click()
      await expect(page.getByText('El monto es demasiado grande.')).toBeVisible()
      await page.getByLabel('Monto').fill('8')

      await page.getByLabel('Fecha').fill('2999-01-01')
      await submitButton(page).click()
      await expect(page.getByText('La fecha no puede ser futura')).toBeVisible()
      await expect(page.getByLabel('Fecha')).toBeFocused()
      await page.getByLabel('Fecha').fill('2026-11-01')
      await expect(page.getByLabel('Fecha')).toHaveAttribute('aria-invalid', 'false')

      await submitButton(page).click()
      await expect(
        page.getByText('La fecha no puede ser anterior al inicio del registro de la Cuenta (10 nov 2026).'),
      ).toBeVisible()
      await expect(page.getByLabel('Monto')).toHaveValue('8')
      expect(await noOverflow(page)).toBe(true)
    })

    test('the primary action is on screen and every control is at least 44px tall on a phone', async ({ page }) => {
      await signUp(page.request)
      const account = await createAccount(page.request)
      await createIncome(page.request, { account_id: account.id, description: 'Intereses' })

      await page.goto('/incomes/create')
      const action = submitButton(page)
      // The action is on screen without scrolling, at the height of the viewport.
      expect(((await action.boundingBox())?.y ?? Infinity) + (await heightOf(action))).toBeLessThanOrEqual(height)
      if (isPhone(width)) {
        for (const control of [
          action,
          page.getByLabel('Cuenta', { exact: true }),
          page.getByLabel('Fecha'),
          page.getByLabel('Descripción'),
          page.getByRole('link', { name: 'Cancelar' }),
        ]) {
          expect(await heightOf(control)).toBeGreaterThanOrEqual(44)
        }
      }

      await page.goto('/incomes')
      expect(await heightOf(incomeRow(page, 'Intereses'))).toBeGreaterThanOrEqual(isPhone(width) ? 44 : 40)
      await incomeRow(page, 'Intereses').click()
      expect(await heightOf(page.getByRole('link', { name: 'Eliminar este ingreso' }))).toBeGreaterThanOrEqual(44)
    })

    test('without a spending or savings Account the screens say what to do first', async ({ page }) => {
      await signUp(page.request)
      await createAccount(page.request, { name: 'Bróker', type: 'investment' })

      await page.goto('/incomes')
      await expect(page.getByRole('link', { name: 'Crear tu primera cuenta' })).toBeVisible()
      await page.goto('/incomes/create')
      await expect(page.getByRole('heading', { name: 'Primero necesitas una Cuenta' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible()
      expect(await noOverflow(page)).toBe(true)
    })

    test('an investment Account is not offered and an archived one only to its own Incomes', async ({ page }) => {
      await signUp(page.request)
      const old = await createAccount(page.request, { name: 'Cuenta vieja', opening_balance: '300.00' })
      await createAccount(page.request, { name: 'Bróker', type: 'investment' })
      await createAccount(page.request, { name: 'Cuenta nueva' })
      await createIncome(page.request, { account_id: old.id, amount: '100.00', description: 'Cobro' })
      await archiveAccount(page.request, old.id)

      await page.goto('/incomes/create')
      const options = page.getByLabel('Cuenta', { exact: true }).locator('option')
      await expect(options).toHaveText(['Cuenta nueva'])

      await page.goto('/incomes')
      await incomeRow(page, 'Cobro').click()
      await expect(page.getByLabel('Cuenta', { exact: true })).toHaveValue(String(old.id))
      await expect(page.getByText('Esta Cuenta está archivada.')).toBeVisible()
      await page.getByLabel('Monto').fill('60')
      await page.getByRole('button', { name: 'Guardar cambios' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toContainText('Saldo de Cuenta vieja: $360.00.')

      await incomeRow(page, 'Cobro').click()
      await page.getByRole('link', { name: 'Eliminar este ingreso' }).click()
      await page.getByRole('button', { name: 'Eliminar ingreso' }).click()
      await expect(page.getByRole('status').filter({ hasText: 'Eliminaste' })).toContainText('Saldo de Cuenta vieja: $300.00.')
    })

    test("an Income that is not the User's, or does not exist, is not found", async ({ page, browser }) => {
      await signUp(page.request)
      const other = await browser.newContext()
      await signUp(other.request)
      const theirs = await createIncome(other.request, {
        account_id: (await createAccount(other.request)).id,
      })
      await other.close()

      for (const id of [String(theirs.id), '999999', 'abc']) {
        for (const action of ['edit', 'delete']) {
          await page.goto(`/incomes/${id}/${action}`)
          await expect(page.getByRole('heading', { name: 'No encontramos este ingreso' })).toBeVisible()
          expect(await noOverflow(page)).toBe(true)
        }
      }
    })

    test('the list shows loading, explains a failure and recovers on retry', async ({ page }) => {
      await signUp(page.request)
      const account = await createAccount(page.request)
      await createIncome(page.request, { account_id: account.id, description: 'Regalo' })

      let attempts = 0
      await page.route('**/api/incomes?*', async (route) => {
        attempts += 1
        if (attempts === 1) {
          await new Promise((resolve) => setTimeout(resolve, 400))
          await route.abort('failed')
        } else {
          await route.continue()
        }
      })
      await page.goto('/incomes')

      await expect(page.getByText('Cargando tus ingresos…')).toBeVisible()
      await expect(page.getByRole('alert')).toContainText('No pudimos conectar con Okane')
      expect(await noOverflow(page)).toBe(true)
      await page.getByRole('button', { name: 'Reintentar' }).click()
      await expect(incomeRow(page, 'Regalo')).toBeVisible()
    })

    test('a save that fails offline is explained and can be repeated', async ({ page }) => {
      await signUp(page.request)
      await createAccount(page.request)
      await page.goto('/incomes/create')
      await page.getByLabel('Monto').fill('9.99')

      await page.route('**/api/incomes', (route) => route.abort('failed'))
      await submitButton(page).click()
      await expect(page.getByRole('alert')).toContainText('No pudimos conectar con Okane')
      await expect(page.getByLabel('Monto')).toHaveValue('9.99')

      await page.unroute('**/api/incomes')
      await submitButton(page).click()
      await expect(page).toHaveURL(/\/incomes$/)
    })

    test('the list pages on request, keeps day headings and the keyboard where it was', async ({ page }) => {
      await signUp(page.request)
      const account = await createAccount(page.request, { opening_balance: '5000.00', opening_date: '2026-01-01' })
      for (let index = 0; index < 51; index += 1) {
        await createIncome(page.request, {
          account_id: account.id,
          amount: '1.00',
          description: `Ingreso ${String(index + 1).padStart(2, '0')}`,
          date: index < 3 ? '2026-11-10' : undefined,
        })
      }

      await page.goto('/incomes')
      await expect(page.getByText('Mostrando 50 de 51 ingresos.')).toBeVisible()
      const more = page.getByRole('button', { name: 'Mostrar más' })
      if (isPhone(width)) expect(await heightOf(more)).toBeGreaterThanOrEqual(44)
      await more.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByText('Mostrando 51 de 51 ingresos.')).toBeVisible()
      await expect(page.locator('a[id^=income-]').nth(50)).toBeFocused()
      await expect(page.getByRole('button', { name: 'Mostrar más' })).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'mar 10 nov' })).toBeVisible()
      expect(await noOverflow(page)).toBe(true)
    })
  })
}

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a row is one link that keeps the whole name and Account, and nothing else to tap', async ({ page }) => {
    await signUp(page.request)
    const account = await createAccount(page.request, { name: 'Cuenta corriente del hogar' })
    await createIncome(page.request, {
      account_id: account.id,
      amount: '1234.50',
      description: 'Pago de la consultoría de noviembre',
    })
    await page.goto('/incomes')

    const row = incomeRow(page, 'Pago de la consultoría de noviembre')
    await expect(row).toContainText('Cuenta corriente del hogar')
    await expect(row).toHaveAttribute('aria-label', /^Editar ingreso .*\$1,234\.50, Cuenta corriente del hogar$/)
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
    const clipped = await row.evaluate((link) =>
      [...link.querySelectorAll('span')].some((span) => span.scrollWidth > span.clientWidth + 1),
    )
    expect(clipped).toBe(false)

    await row.click()
    await expect(page).toHaveURL(/\/incomes\/\d+\/edit$/)
    await page.getByRole('link', { name: 'Eliminar este ingreso' }).click()
    await expect(page).toHaveURL(/\/incomes\/\d+\/delete$/)
  })
})
