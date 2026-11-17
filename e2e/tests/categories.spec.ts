import type { Page } from '@playwright/test'
import { expect, expectScreenQuality, test } from './support/qa.js'
import { createAccount, createCategory, createExpense, createRecurringPayment } from './support/ledger.js'
import { signUp } from './support/session.js'

/** Fails the test if the page ever opens a browser alert, confirm or prompt. */
function forbidBrowserDialogs(page: Page) {
  page.on('dialog', (dialog) => {
    throw new Error(`Unexpected browser dialog: ${dialog.message()}`)
  })
}

const panamaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date())

/** The row of an own Category in the list: one link to its edit screen. */
const categoryRow = (page: Page, name: string) => page.getByRole('link', { name: new RegExp(`^${name}.*Editar Categoría$`) })

for (const colorScheme of ['light', 'dark'] as const) {
  test(`categories lifecycle in ${colorScheme}`, async ({ page }) => {
    forbidBrowserDialogs(page)
    await page.emulateMedia({ colorScheme })
    await signUp(page.request)
    const account = await createAccount(page.request, { name: 'Cuenta corriente' })

    await page.goto('/categories')
    await expect(page.getByRole('heading', { name: 'Categorías', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Categorías iniciales' })).toBeVisible()
    await expect(page.getByText('Vivienda', { exact: true })).toBeVisible()
    await expect(page.getByText('Aún no creaste ninguna.')).toBeVisible()
    await expectScreenQuality(page, `categories-initial-${colorScheme}`)

    await page.getByRole('link', { name: 'Nueva Categoría' }).click()
    await expect(page).toHaveURL(/\/categories\/create$/)
    await page.getByLabel('Nombre').fill('Mascotas')
    await expectScreenQuality(page, `categories-create-filled-${colorScheme}`)
    await page.getByRole('button', { name: 'Crear Categoría' }).click()

    await expect(page).toHaveURL(/\/categories$/)
    await expect(page.getByRole('status').filter({ hasText: 'Creaste' })).toHaveText('Creaste la Categoría Mascotas.')
    await expect(categoryRow(page, 'Mascotas')).toBeVisible()
    // The populated list keeps its create action.
    await expect(page.getByRole('link', { name: 'Nueva Categoría' })).toBeVisible()
    await expectScreenQuality(page, `categories-list-${colorScheme}`)

    // The new Category is offered for a Budget, and an Expense can name it.
    await page.goto('/budgets/create')
    await expect(page.getByText('Mascotas', { exact: true })).toBeVisible()
    await page.getByText('Mascotas', { exact: true }).click()
    await page.getByLabel('Monto del Presupuesto').fill('80')
    await page.getByRole('button', { name: 'Crear Presupuesto' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Creaste' })).toContainText('para Mascotas')
    await page.goto('/categories')
    const mascotas = await page.request.get('/api/categories').then((response) => response.json())
    const own = mascotas.results.find((category: { name: string }) => category.name === 'Mascotas')
    await createExpense(page.request, { account_id: account.id, amount: '25.00', category_id: own.id, description: 'Croquetas' })

    await categoryRow(page, 'Mascotas').click()
    await expect(page.getByLabel('Nombre')).toHaveValue('Mascotas')
    await page.getByLabel('Nombre').fill('Mis mascotas')
    await expectScreenQuality(page, `categories-edit-${colorScheme}`)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardaste' })).toContainText('Mis mascotas')

    // The new name shows in past records too.
    await page.goto('/expenses')
    await expect(page.getByRole('link', { name: /^Croquetas.*Mis mascotas/ })).toBeVisible()

    await page.goto('/categories')
    await categoryRow(page, 'Mis mascotas').click()
    await page.getByRole('link', { name: 'Archivar esta Categoría' }).click()
    await expect(page).toHaveURL(/\/categories\/\d+\/archive$/)
    await expect(page.getByText('se siguen viendo')).toBeVisible()
    await expectScreenQuality(page, `categories-archive-${colorScheme}`)
    await page.getByRole('button', { name: 'Archivar Categoría' }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Archivaste' })).toContainText('Mis mascotas')
    await expect(page.getByRole('heading', { name: 'Archivadas' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Mis mascotas/ })).toBeHidden()
    await expectScreenQuality(page, `categories-archived-${colorScheme}`)

    // Archived: not offered for new records, but the past ones stay visible.
    await page.goto('/budgets/create')
    await expect(page.getByText('Alimentación', { exact: true })).toBeVisible()
    await expect(page.getByText('Mis mascotas', { exact: true })).toBeHidden()
    await page.goto('/expenses')
    await expect(page.getByRole('link', { name: /^Croquetas.*Mis mascotas/ })).toBeVisible()
    await page.goto('/budgets')
    await expect(page.getByRole('link', { name: /^Mis mascotas/ })).toBeVisible()
  })
}

test('archiving is refused while the Category has recurring payments', async ({ page, expectedProblems }) => {
  // The 409 api-service answers is what the test provokes on purpose.
  expectedProblems.push('409')
  forbidBrowserDialogs(page)
  await signUp(page.request)
  const account = await createAccount(page.request, { name: 'Cuenta corriente' })
  const category = await createCategory(page.request, 'Suscripciones')
  await createRecurringPayment(page.request, {
    account_id: account.id,
    start_date: panamaToday(),
    category_id: category.id,
    description: 'Streaming',
  })

  await page.goto(`/categories/${category.id}/archive`)
  await page.getByRole('button', { name: 'Archivar Categoría' }).click()

  await expect(page.getByRole('alert')).toContainText('Mueve o elimina los pagos recurrentes de esta Categoría')
  await expect(page).toHaveURL(/\/categories\/\d+\/archive$/)
  await expectScreenQuality(page, 'categories-archive-refused')
})

test('the initial Categories and another User\'s Category cannot be edited', async ({ page, expectedProblems }) => {
  // The 404 for a Category that is not the User's is what the test provokes on purpose.
  expectedProblems.push('404')
  forbidBrowserDialogs(page)
  await signUp(page.request)
  await page.goto('/categories/1/edit')
  await expect(page.getByRole('heading', { name: 'Esta Categoría no se puede cambiar' })).toBeVisible()
  await expectScreenQuality(page, 'categories-initial-not-editable')

  const other = await page.context().browser()!.newContext()
  const otherPage = await other.newPage()
  await signUp(otherPage.request)
  const theirs = await createCategory(otherPage.request, 'Secreta')
  await other.close()

  await page.goto(`/categories/${theirs.id}/edit`)
  await expect(page.getByRole('heading', { name: 'No encontramos esta Categoría' })).toBeVisible()
})
