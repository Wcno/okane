import { expect, test, type Page } from '@playwright/test'
import { signUp } from './support/session.js'

const routes = ['/dashboard', '/menu', '/expenses']

test.beforeEach(async ({ page }) => {
  await signUp(page.request)
})

function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`))
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`)
  })
  return problems
}

for (const route of routes) {
  test(`${route} renders the Spanish shell without errors`, async ({ page }) => {
    const problems = collectProblems(page)

    await page.goto(route)

    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page).toHaveTitle(/Okane/)
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Secciones' }).first()).toBeVisible()
    expect(problems).toEqual([])
  })

  test(`${route} fits the viewport without horizontal scrolling`, async ({ page }) => {
    await page.goto(route)
    await expect(page.getByRole('main')).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}
