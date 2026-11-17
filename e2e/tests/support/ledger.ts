import { expect, type APIRequestContext } from '@playwright/test'

interface AccountFields {
  name?: string
  type?: 'spending' | 'savings' | 'investment'
  opening_balance?: string
  opening_date?: string
}

async function csrfToken(request: APIRequestContext) {
  const session = await request.get('/auth/session')
  return (await session.json()).csrf_token as string
}

/** The initial Categories every User starts with, by the key api-service gives their copy. */
export type InitialCategory = 'housing' | 'food' | 'transport' | 'utilities' | 'health' | 'entertainment' | 'education' | 'other'

/** The id of one of the User's initial Categories; ids are per User, so they are looked up. */
export async function categoryIdOf(request: APIRequestContext, key: InitialCategory) {
  const response = await request.get('/api/categories')
  expect(response.status()).toBe(200)
  const { results } = (await response.json()) as { results: { id: number; key: string | null }[] }
  const found = results.find((category) => category.key === key)
  expect(found, `the initial Category ${key}`).toBeDefined()
  return found!.id
}

async function send(request: APIRequestContext, method: 'POST' | 'DELETE', path: string, data?: unknown) {
  return request.fetch(path, {
    method,
    data,
    headers: { 'X-CSRFToken': await csrfToken(request) },
  })
}

/** Creates an Account through webapp the way the screen does; the User is the request's session. */
export async function createAccount(request: APIRequestContext, fields: AccountFields = {}) {
  const response = await send(request, 'POST', '/api/accounts', {
    name: 'Cuenta corriente',
    type: 'spending',
    opening_balance: '1000.00',
    opening_date: '2026-01-01',
    ...fields,
  })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number; name: string }
}

interface ExpenseFields {
  account_id: number
  amount?: string
  category?: InitialCategory
  category_id?: number
  date?: string
  description?: string
}

export async function createExpense(request: APIRequestContext, { category = 'food', ...fields }: ExpenseFields) {
  const category_id = fields.category_id ?? (await categoryIdOf(request, category))
  const response = await send(request, 'POST', '/api/expenses', { amount: '10.00', ...fields, category_id })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

interface BudgetFields {
  category?: InitialCategory
  category_id?: number
  month: string
  amount?: string
}

export async function createBudget(request: APIRequestContext, { category = 'food', ...fields }: BudgetFields) {
  const category_id = fields.category_id ?? (await categoryIdOf(request, category))
  const response = await send(request, 'POST', '/api/budgets', { amount: '300.00', ...fields, category_id })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

interface IncomeFields {
  account_id: number
  amount?: string
  date?: string
  description?: string
}

export async function createIncome(request: APIRequestContext, fields: IncomeFields) {
  const response = await send(request, 'POST', '/api/incomes', { amount: '10.00', ...fields })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

/** Archives an Account that has records, as deleting it in the screen does. */
export async function archiveAccount(request: APIRequestContext, accountId: number) {
  const response = await send(request, 'DELETE', `/api/accounts/${accountId}`)
  expect(response.status()).toBe(200)
}

interface RecurringPaymentFields {
  account_id: number
  start_date: string
  amount?: string
  category?: InitialCategory
  category_id?: number
  day_of_month?: number
  description?: string
}

/** Creates a rule; api-service materializes its occurrences the next time the User reads financial data. */
export async function createRecurringPayment(
  request: APIRequestContext,
  { category = 'housing', ...fields }: RecurringPaymentFields,
) {
  const category_id = fields.category_id ?? (await categoryIdOf(request, category))
  const response = await send(request, 'POST', '/api/recurring-payments', {
    amount: '500.00',
    day_of_month: 1,
    ...fields,
    category_id,
  })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

/** Creates one of the User's own Categories. */
export async function createCategory(request: APIRequestContext, name: string) {
  const response = await send(request, 'POST', '/api/categories', { name })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number; name: string }
}

/** The ids of the occurrences the list shows for a rule, oldest due first. */
export async function listOccurrenceIds(request: APIRequestContext, ruleId: number) {
  const response = await request.get('/api/recurring-payments?page_size=50')
  expect(response.status()).toBe(200)
  const { results } = (await response.json()) as {
    results: { id: number; occurrences: { id: number; due_date: string }[] }[]
  }
  const rule = results.find((candidate) => candidate.id === ruleId)
  return [...(rule?.occurrences ?? [])].sort((a, b) => a.due_date.localeCompare(b.due_date)).map(({ id }) => id)
}

/** Cancels an occurrence behind the screen's back, as another tab would. */
export async function cancelOccurrence(request: APIRequestContext, occurrenceId: number) {
  const response = await send(request, 'POST', `/api/recurring-payments/occurrences/${occurrenceId}/cancel`)
  expect(response.status()).toBe(200)
}
