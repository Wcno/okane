import { expect, test, type Page } from '@playwright/test'
import { createAccount, createExpense } from './support/ledger.js'
import { PASSWORD, signUp } from './support/session.js'

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]

async function openDeleteScreen(page: Page, width: number) {
  await page.goto(width < 1024 ? '/menu' : '/dashboard')
  await page.getByRole('link', { name: 'Eliminar usuario' }).click()
  await expect(page.getByRole('heading', { name: 'Eliminar usuario' })).toBeVisible()
}

async function expectUsableLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const confirm = page.getByRole('button', { name: 'Eliminar mi usuario' })
  await expect(confirm).toBeInViewport()
  expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const cancel = page.getByRole('link', { name: 'Cancelar' })
  expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(44)
}

for (const viewport of WIDTHS) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${viewport.width}px in ${colorScheme}`, () => {
      test.use({ viewport, colorScheme })

      test('the screen warns, asks for the password and keeps its action in view', async ({ page }) => {
        await signUp(page.request)
        await openDeleteScreen(page, viewport.width)

        await expect(page.getByText('No se puede deshacer')).toBeVisible()
        await expect(page.getByLabel('Tu contraseña')).toHaveAttribute('type', 'password')
        await expectUsableLayout(page)
      })
    })
  }
}

for (const viewport of WIDTHS) {
  test.describe(`deleting a user at ${viewport.width}px`, () => {
    test.use({ viewport })

    test('removes the User and the data, ends the session and frees the email', async ({ page, browser }) => {
      const email = await signUp(page.request)
      const account = await createAccount(page.request)
      await createExpense(page.request, { account_id: account.id })
      const otherDevice = await browser.newContext()
      const login = await otherDevice.request.get('/auth/session')
      const { csrf_token: loginToken } = await login.json()
      await otherDevice.request.post('/auth/login', {
        data: { email, password: PASSWORD },
        headers: { 'X-CSRFToken': loginToken },
      })
      expect((await otherDevice.request.get('/api/accounts')).status()).toBe(200)

      await openDeleteScreen(page, viewport.width)

      // An empty password is explained before anything is sent.
      await page.getByRole('button', { name: 'Eliminar mi usuario' }).click()
      const password = page.getByLabel('Tu contraseña')
      await expect(page.getByText('Escribe tu contraseña para confirmar.')).toBeVisible()
      await expect(password).toBeFocused()

      // A wrong one is refused, and its error goes away when the field changes.
      await password.fill('not-the-password')
      await expect(page.getByText('Escribe tu contraseña para confirmar.')).toHaveCount(0)
      await page.getByRole('button', { name: 'Eliminar mi usuario' }).click()
      await expect(page.getByText('La contraseña no coincide. Revísala e inténtalo de nuevo.')).toBeVisible()
      await expect(password).toHaveAttribute('aria-invalid', 'true')
      await password.fill('x')
      await expect(password).toHaveAttribute('aria-invalid', 'false')

      await password.fill(PASSWORD)
      await password.press('Enter')

      await expect(page.getByRole('heading', { name: 'Eliminaste tu usuario' })).toBeVisible()
      expect((await page.request.get('/api/accounts')).status()).toBe(401)
      expect((await otherDevice.request.get('/api/accounts')).status()).toBe(401)
      await otherDevice.close()

      // The email is free: the same address registers again with no data.
      await page.getByRole('link', { name: 'Crear un usuario nuevo' }).click()
      await signUp(page.request, email)
      await page.goto('/accounts')
      await expect(page.getByRole('heading', { name: 'Aún no tienes Cuentas' })).toBeVisible()
    })

    test('says that nothing was deleted when the financial service does not respond, and lets the User retry', async ({
      page,
    }) => {
      await signUp(page.request)
      await openDeleteScreen(page, viewport.width)
      await page.route('**/users/me', (route) =>
        route.fulfill({ status: 502, json: { status: 'unavailable', service: 'api-service' } }),
      )
      await page.getByLabel('Tu contraseña').fill(PASSWORD)

      await page.getByRole('button', { name: 'Eliminar mi usuario' }).click()

      await expect(page.getByRole('alert')).toContainText('el servicio financiero no responde')
      await expect(page.getByRole('alert')).toContainText('No se eliminó nada')
      await expect(page.getByRole('button', { name: 'Eliminar mi usuario' })).toBeEnabled()
      await expectUsableLayout(page)

      await page.unroute('**/users/me')
      await page.getByRole('button', { name: 'Eliminar mi usuario' }).click()
      await expect(page.getByRole('heading', { name: 'Eliminaste tu usuario' })).toBeVisible()
    })
  })
}

test('the delete screen needs a session', async ({ page }) => {
  await page.goto('/profile/delete')

  await expect(page).toHaveURL(/\/login$/)
})
