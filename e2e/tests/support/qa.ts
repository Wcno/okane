import AxeBuilder from '@axe-core/playwright'
import { expect, test as base, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const screenshotsDirectory = fileURLToPath(new URL('../../qa-screenshots/', import.meta.url))

/** A problem a test expects, matched against its description. */
type ExpectedProblem = string | RegExp

/** Whether a collected problem is the one an expectation describes. */
function matches(problem: string, expected: ExpectedProblem) {
  return typeof expected === 'string' ? problem.includes(expected) : expected.test(problem)
}

/** Runs one step during which the expected problems are tolerated, and no others. */
export type ExpectProblemsDuring = (expected: ExpectedProblem, step: () => Promise<void>) => Promise<void>

interface QaFixtures {
  /**
   * The opt-out list of one test: push each expected problem with a comment saying why,
   * for example a 400 the test provokes on purpose.
   */
  expectedProblems: ExpectedProblem[]
  /**
   * Tolerates the expected problem only while `step` runs, then once the page has
   * settled. Use it for a problem a single action causes, so the rest of the test still fails on it.
   */
  expectProblemsDuring: ExpectProblemsDuring
  /** The expectations `expectProblemsDuring` has open, read by the collector of the page. */
  openExpectations: ExpectedProblem[]
}

/**
 * Collects what a User would never see but a QA pass must: console errors, page
 * errors, failed requests and 5xx responses of every page in the test's context.
 * A problem matched by an open expectation is not collected.
 */
function collectProblems(page: Page, openExpectations: ExpectedProblem[]) {
  const problems: string[] = []
  const report = (problem: string) => {
    if (!openExpectations.some((expected) => matches(problem, expected))) problems.push(problem)
  }
  const context = page.context()
  context.on('console', (message) => {
    if (message.type() !== 'error') return
    // A failed resource is reported without its address; the location carries the URL that failed.
    const url = message.location().url
    report(`console error: ${message.text()}${url ? ` ${url}` : ''}`)
  })
  context.on('weberror', (error) => report(`page error: ${error.error().message}`))
  context.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText
    // The browser cancels in-flight requests when the page navigates or reloads; nothing failed.
    if (reason === 'net::ERR_ABORTED') return
    report(`request failed: ${request.method()} ${request.url()} ${reason}`)
  })
  context.on('response', (response) => {
    if (response.status() >= 500) report(`server error: ${response.status()} ${response.url()}`)
  })
  return problems
}

export const test = base.extend<QaFixtures>({
  expectedProblems: async ({}, use) => use([]),

  openExpectations: async ({}, use) => use([]),

  expectProblemsDuring: async ({ page, openExpectations }, use) => {
    await use(async (expected, step) => {
      openExpectations.push(expected)
      try {
        await step()
        // The reads the step cut short can be reported after it returns; keep the expectation until they are.
        await page.waitForLoadState('networkidle')
      } finally {
        openExpectations.splice(openExpectations.indexOf(expected), 1)
      }
    })
  },

  page: async ({ page, expectedProblems, openExpectations }, use, testInfo) => {
    const problems = collectProblems(page, openExpectations)
    await use(page)
    if (testInfo.status !== testInfo.expectedStatus) return
    const unexpected = problems.filter((problem) => !expectedProblems.some((expected) => matches(problem, expected)))
    expect(unexpected, 'the page logged errors or failed requests').toEqual([])
  },
})

export { expect }

/**
 * The quality bar of one screen state: no horizontal overflow, no serious or
 * critical axe violation, and a full-page screenshot in qa-screenshots/<project>/
 * for the screenshot-qa review. Call it once per distinct state; the name is the file name.
 */
export async function expectScreenQuality(page: Page, name: string) {
  const project = test.info().project.name
  await mkdir(`${screenshotsDirectory}${project}`, { recursive: true })
  await page.screenshot({ path: `${screenshotsDirectory}${project}/${name}.png`, fullPage: true, animations: 'disabled' })

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} scrolls horizontally`).toBeLessThanOrEqual(0)

  const { violations } = await new AxeBuilder({ page }).analyze()
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
