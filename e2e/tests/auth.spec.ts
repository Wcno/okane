import { expect, test, type Locator, type Page } from '@playwright/test'
import { PASSWORD, signUp, uniqueEmail } from './support/session.js'

async function fillCredentials(page: Page, email: string, password: string) {
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(password)
}

/**
 * Opens the screen that holds the in-app sign-out control: the sidebar of any
 * screen on a PC, the Menú screen on a phone. Only one control is visible.
 */
async function openSignOutControl(page: Page, isMobile: boolean) {
  await page.goto(isMobile ? '/menu' : '/dashboard')
  const control = page.getByRole('button', { name: 'Cerrar sesión' })
  await expect(control).toBeVisible()
  return control
}

test('a visitor is sent to login and comes back after registering', async ({ page }) => {
  const email = uniqueEmail()

  await page.goto('/budgets')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Regístrate' }).click()
  await expect(page.getByRole('heading', { name: 'Crear tu usuario' })).toBeVisible()
  await fillCredentials(page, email, PASSWORD)
  await page.getByRole('button', { name: 'Crear usuario' }).click()

  await expect(page).toHaveURL(/\/budgets$/)
  await expect(page.getByRole('heading', { name: 'Presupuestos' })).toBeVisible()
})

test('registering with an email already in use says what happened', async ({ page, request }) => {
  const email = await signUp(request)

  await page.goto('/register')
  await fillCredentials(page, email.toUpperCase(), PASSWORD)
  await page.getByRole('button', { name: 'Crear usuario' }).click()

  await expect(page.getByText('Ya existe un usuario con este correo. Inicia sesión o regístrate con otro correo.')).toBeVisible()
  await expect(page.getByLabel('Correo')).toBeFocused()
  await expect(page).toHaveURL(/\/register$/)
})

test('a short password is explained before it is sent', async ({ page }) => {
  await page.goto('/register')
  await fillCredentials(page, uniqueEmail(), 'corta')
  await page.getByRole('button', { name: 'Crear usuario' }).click()

  await expect(page.getByText('La contraseña debe tener al menos 10 caracteres. Te faltan 5.')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeFocused()
})

test('a wrong password does not reveal whether the email exists', async ({ page, request }) => {
  const email = await signUp(request)

  await page.goto('/login')
  await fillCredentials(page, email, 'not-the-password')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('alert')).toHaveText(
    'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.',
  )
  await expect(page).toHaveURL(/\/login$/)

  // A correct attempt right after clears the count, so reruns never hit the limit.
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('login works with the keyboard alone', async ({ page, request }) => {
  const email = await signUp(request)

  await page.goto('/login')
  // Start from the logo, the first stop of the page, and move only with keys.
  await page.getByRole('link', { name: 'Okane, ir al Panel' }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Correo')).toBeFocused()
  await page.keyboard.type(email)
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Contraseña')).toBeFocused()
  await page.keyboard.type(PASSWORD)
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText(email).first()).toBeAttached()
})

test('one click on the in-app control signs out at once', async ({ page, isMobile }) => {
  await signUp(page.request)
  const control = await openSignOutControl(page, isMobile)
  expect((await page.request.get('/api/accounts')).status()).not.toBe(401)

  await control.click()

  await expect(page.getByRole('heading', { name: 'Cerraste tu sesión' })).toBeVisible()
  await expect(page).toHaveURL(/\/logout$/)
  expect((await page.request.get('/api/accounts')).status()).toBe(401)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})

test('the in-app sign-out control works with the keyboard alone', async ({ page, isMobile }) => {
  await signUp(page.request)
  const control = await openSignOutControl(page, isMobile)

  await page.getByRole('link', { name: 'Okane, ir al Panel' }).first().focus()
  for (let stops = 0; stops < 40 && !(await control.evaluate((element) => element === document.activeElement)); stops++) {
    await page.keyboard.press('Tab')
  }
  await expect(control).toBeFocused()
  const outline = await control.evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outline).toBe('solid')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Cerraste tu sesión' })).toBeVisible()
  expect((await page.request.get('/api/accounts')).status()).toBe(401)
})

test('opening the logout screen only asks; the session stays open', async ({ page }) => {
  const email = await signUp(page.request)

  await page.goto('/logout')

  await expect(page.getByRole('heading', { name: '¿Cerrar tu sesión?' })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  expect((await page.request.get('/api/accounts')).status()).not.toBe(401)
  await page.getByRole('link', { name: 'Volver al Panel' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('signing out works with the keyboard alone', async ({ page }) => {
  await signUp(page.request)

  await page.goto('/logout')
  await page.getByRole('link', { name: 'Okane, ir al Panel' }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Cerraste tu sesión' })).toBeVisible()
  expect((await page.request.get('/api/accounts')).status()).toBe(401)
})

test('a signed-in User who opens login goes to the Panel', async ({ page }) => {
  await signUp(page.request)

  await page.goto('/login')

  await expect(page).toHaveURL(/\/dashboard$/)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    const screens = [
      { route: '/login', signedIn: false, controls: credentialControls('Iniciar sesión') },
      { route: '/register', signedIn: false, controls: credentialControls('Crear usuario') },
      { route: '/logout', signedIn: true, controls: (page: Page) => [page.getByRole('button', { name: 'Cerrar sesión' })] },
    ]

    for (const { route, signedIn, controls } of screens) {
      test(`${route} fits the viewport and shows focus on every control`, async ({ page }) => {
        if (signedIn) await signUp(page.request)
        await page.goto(route)
        await expect(page.getByRole('main')).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('lang', 'es')

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(0)

        await page.keyboard.press('Tab')
        await expectVisibleFocus(page.getByRole('link', { name: 'Okane, ir al Panel' }))
        for (const control of controls(page)) {
          await page.keyboard.press('Tab')
          await expectVisibleFocus(control)
        }
      })
    }
  })
}

function credentialControls(submit: string) {
  return (page: Page) => [
    page.getByLabel('Correo'),
    page.getByLabel('Contraseña'),
    page.getByRole('button', { name: submit }),
  ]
}

/** Focused, with an outline or a ring (DESIGN.md: buttons use an outline, fields a ring). */
async function expectVisibleFocus(control: Locator) {
  await expect(control).toBeFocused()
  const indicator = await control.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0, ring: style.boxShadow !== 'none' }
  })
  expect(indicator.outline || indicator.ring).toBe(true)
}
