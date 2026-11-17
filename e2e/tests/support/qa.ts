import AxeBuilder from '@axe-core/playwright'
import { expect, test as base, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const screenshotsDirectory = fileURLToPath(new URL('../../qa-screenshots/', import.meta.url))

/** A problem a test expects, matched against its description. */
type ExpectedProblem = string | RegExp

interface QaFixtures {
  /**
   * The opt-out list of one test: push each expected problem with a comment saying why,
   * for example a 400 the test provokes on purpose.
   */
  expectedProblems: ExpectedProblem[]
}

/**
 * Collects what a User would never see but a QA pass must: console errors, page
 * errors, failed requests and 5xx responses of every page in the test's context.
 */
function collectProblems(page: Page) {
  const problems: string[] = []
  const context = page.context()
  context.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`)
  })
  context.on('weberror', (error) => problems.push(`page error: ${error.error().message}`))
  context.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText
    // The browser cancels in-flight requests when the page navigates or reloads; nothing failed.
    if (reason === 'net::ERR_ABORTED') return
    problems.push(`request failed: ${request.method()} ${request.url()} ${reason}`)
  })
  context.on('response', (response) => {
    if (response.status() >= 500) problems.push(`server error: ${response.status()} ${response.url()}`)
  })
  return problems
}

export const test = base.extend<QaFixtures>({
  expectedProblems: async ({}, use) => use([]),

  page: async ({ page, expectedProblems }, use, testInfo) => {
    const problems = collectProblems(page)
    await use(page)
    if (testInfo.status !== testInfo.expectedStatus) return
    const unexpected = problems.filter(
      (problem) => !expectedProblems.some((expected) => (typeof expected === 'string' ? problem.includes(expected) : expected.test(problem))),
    )
    expect(unexpected, 'the page logged errors or failed requests').toEqual([])
  },
})

export { expect }

/**
 * Known axe problems of screens that exist today, to skip until the app fixes them.
 * Delete an entry, and its use in the specs, with the fix.
 */
export const knownAxeRules = {
  // The large balance figure is a <p aria-label>; a paragraph has no role that allows a label.
  // AvailableCard (dashboard) and Total (accounts list) both do it. Fix: a visually hidden text in place of the label.
  balanceFigureLabel: ['aria-prohibited-attr'],
}

interface ScreenQualityOptions {
  /** Axe rules to skip on this screen. Each entry needs a comment naming the known problem. */
  skipAxeRules?: string[]
}

/**
 * The quality bar of one screen state: no horizontal overflow, no serious or
 * critical axe violation, and a full-page screenshot in qa-screenshots/<project>/
 * for the screenshot-qa review. Call it once per distinct state; the name is the file name.
 */
export async function expectScreenQuality(page: Page, name: string, options: ScreenQualityOptions = {}) {
  const project = test.info().project.name
  await mkdir(`${screenshotsDirectory}${project}`, { recursive: true })
  await page.screenshot({ path: `${screenshotsDirectory}${project}/${name}.png`, fullPage: true, animations: 'disabled' })

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} scrolls horizontally`).toBeLessThanOrEqual(0)

  const { violations } = await new AxeBuilder({ page }).disableRules(options.skipAxeRules ?? []).analyze()
  const blocking = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }))
  expect(blocking, `${name} has serious axe violations`).toEqual([])
}
