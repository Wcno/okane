import { expect, test, type Locator, type Page } from '@playwright/test'
import { resetLinkPathFor } from './support/mail.js'
import { PASSWORD, signUp, uniqueEmail } from './support/session.js'

const NEW_PASSWORD = 'staple-battery-horse'

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
}

test('a User who forgot the password gets a link, sets a new one and signs in', async ({ page, request }) => {
  const email = await signUp(request)

  await page.goto('/login')
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
  await expect(page.getByRole('heading', { name: 'Recuperar tu contraseña' })).toBeVisible()
  await page.getByLabel('Correo').fill(email)
  await page.getByRole('button', { name: 'Enviar enlace' }).click()
  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(email)

  const link = await resetLinkPathFor(email)
  await page.goto(link)
  await page.getByLabel('Contraseña nueva').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toHaveText('Tu contraseña se cambió. Inicia sesión con la nueva.')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)

  // The link worked once: opening it again explains it and offers a new one.
  await page.goto(link)
  await page.getByLabel('Contraseña nueva').fill('another-fine-password')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Este enlace ya no sirve: se usó o caducó. Pide uno nuevo para restablecer tu contraseña.',
  )
  await page.getByRole('link', { name: 'Pide uno nuevo' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)
})

test('a link that was never issued is explained when the password is sent', async ({ page }) => {
  await page.goto('/reset-password/1-abc-def')
  await page.getByLabel('Contraseña nueva').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()

  await expect(page.getByRole('alert')).toContainText('Este enlace ya no sirve')
  await expect(page).toHaveURL(/\/reset-password\//)
})

test('a short new password is explained before it is sent', async ({ page }) => {
  await page.goto('/reset-password/1-abc-def')
  await page.getByLabel('Contraseña nueva').fill('corta')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()

  await expect(page.getByText('La contraseña debe tener al menos 10 caracteres. Te faltan 5.')).toBeVisible()
  await expect(page.getByLabel('Contraseña nueva')).toBeFocused()
})

test('a malformed email is explained before asking for a link', async ({ page }) => {
  await page.goto('/forgot-password')
  await page.getByLabel('Correo').fill('ana.ejemplo.com')
  await page.getByRole('button', { name: 'Enviar enlace' }).click()

  await expect(page.getByText('Escribe tu correo completo, por ejemplo ana@ejemplo.com.')).toBeVisible()
  await expect(page.getByLabel('Correo')).toBeFocused()
})

test('changing the password asks for the current one and keeps this session', async ({ page, browser, isMobile }) => {
  const email = await signUp(page.request)
  const otherDevice = await browser.newContext()
  const otherPage = await otherDevice.newPage()
  await signIn(otherPage, email, PASSWORD)
  await expect(otherPage).toHaveURL(/\/dashboard$/)

  await page.goto(isMobile ? '/menu' : '/dashboard')
  await page.getByRole('link', { name: 'Cambiar contraseña' }).click()
  await expect(page.getByRole('heading', { name: 'Cambiar contraseña' })).toBeVisible()

  await page.getByLabel('Contraseña actual').fill('not-the-password')
  await page.getByLabel('Contraseña nueva').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(page.getByText('La contraseña actual no coincide. Revísala e inténtalo de nuevo.')).toBeVisible()
  await expect(page.getByLabel('Contraseña actual')).toBeFocused()

  await page.getByLabel('Contraseña actual').fill(PASSWORD)
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Tu contraseña se cambió' })).toBeVisible()

  // This session goes on; the one on the other device ended.
  expect((await page.request.get('/api/accounts')).status()).not.toBe(401)
  await otherPage.goto('/dashboard')
  await expect(otherPage).toHaveURL(/\/login$/)
  await signIn(otherPage, email, NEW_PASSWORD)
  await expect(otherPage).toHaveURL(/\/dashboard$/)
  await otherDevice.close()
})

test('the change password screen needs a session', async ({ page }) => {
  await page.goto('/profile/change-password')

  await expect(page).toHaveURL(/\/login$/)
})

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    test('/forgot-password fits the viewport and shows focus on every control', async ({ page }) => {
      await page.goto('/forgot-password')
      await expectNoHorizontalScroll(page)

      await page.keyboard.press('Tab')
      await expectVisibleFocus(page.getByRole('link', { name: 'Okane, ir al Panel' }))
      for (const control of [page.getByLabel('Correo'), page.getByRole('button', { name: 'Enviar enlace' })]) {
        await page.keyboard.press('Tab')
        await expectVisibleFocus(control)
      }
    })

    test('/reset-password fits the viewport and shows focus on every control', async ({ page }) => {
      await page.goto('/reset-password/1-abc-def')
      await expectNoHorizontalScroll(page)

      await page.keyboard.press('Tab')
      await expectVisibleFocus(page.getByRole('link', { name: 'Okane, ir al Panel' }))
      for (const control of [page.getByLabel('Contraseña nueva'), page.getByRole('button', { name: 'Guardar contraseña' })]) {
        await page.keyboard.press('Tab')
        await expectVisibleFocus(control)
      }
    })

    test('/profile/change-password fits the viewport and works with the keyboard alone', async ({ page }) => {
      await signUp(page.request)
      await page.goto('/profile/change-password')
      await expectNoHorizontalScroll(page)

      const current = page.getByLabel('Contraseña actual')
      await current.focus()
      await expectVisibleFocus(current)
      await page.keyboard.type(PASSWORD)
      await page.keyboard.press('Tab')
      await expectVisibleFocus(page.getByLabel('Contraseña nueva'))
      await page.keyboard.type(NEW_PASSWORD)
      await page.keyboard.press('Tab')
      await expectVisibleFocus(page.getByRole('button', { name: 'Cambiar contraseña' }))
      await page.keyboard.press('Enter')

      await expect(page.getByRole('status').filter({ hasText: 'Tu contraseña se cambió' })).toBeVisible()
    })
  })
}

async function expectNoHorizontalScroll(page: Page) {
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
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
