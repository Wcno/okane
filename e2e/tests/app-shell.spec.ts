import { expect, expectScreenQuality, knownAxeRules, test } from './support/qa.js'
import { signUp } from './support/session.js'

const routes = ['/dashboard', '/menu', '/expenses']

test.beforeEach(async ({ page }) => {
  await signUp(page.request)
})

for (const route of routes) {
  test(`${route} renders the Spanish shell and meets the screen quality bar`, async ({ page }) => {
    await page.goto(route)

    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page).toHaveTitle(/Okane/)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Secciones' }).first()).toBeVisible()
    await expectScreenQuality(page, `shell${route.replaceAll('/', '-')}`, {
      skipAxeRules: route === '/dashboard' ? knownAxeRules.balanceFigureLabel : [],
    })
  })
}
