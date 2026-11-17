import { expect, type APIRequestContext } from '@playwright/test'

interface AccountFields {
  name?: string
  type?: 'spending' | 'savings' | 'investment'
  opening_balance?: string
  opening_date?: string
  /** A ratio: 4.25% is "0.0425". Only a savings Account takes one. */
  annual_interest_rate?: string
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

async function send(request: APIRequestContext, method: 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown) {
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

interface TransferFields {
  source_account_id: number
  destination_account_id: number
  amount?: string
  date?: string
  description?: string
}

export async function createTransfer(request: APIRequestContext, fields: TransferFields) {
  const response = await send(request, 'POST', '/api/transfers', { amount: '100.00', ...fields })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

/** Archives an Account that has records, as deleting it in the screen does. */
export async function archiveAccount(request: APIRequestContext, accountId: number) {
  const response = await send(request, 'DELETE', `/api/accounts/${accountId}`)
  expect(response.status()).toBe(200)
}

/** The first Asset the search finds for a query; the stack serves the sample catalog. */
export async function findAsset(request: APIRequestContext, query: string, market?: string) {
  const response = await request.get(`/api/investments/assets/search?q=${encodeURIComponent(query)}`)
  expect(response.status()).toBe(200)
  const { results } = (await response.json()) as { results: { id: number; market: string }[] }
  const asset = results.find((item) => market === undefined || item.market === market)
  expect(asset, `no ${query} in the catalog`).toBeTruthy()
  return asset!
}

interface TradeFields {
  account_id: number
  asset_id: number
  units: string
  unit_price: string
  commission?: string
  date?: string
}

interface DividendFields {
  account_id: number
  asset_id: number
  amount: string
  date?: string
}

export async function recordTrade(
  request: APIRequestContext,
  kind: 'buy' | 'sell' | 'dividend',
  fields: TradeFields | DividendFields,
) {
  const response = await send(request, 'POST', `/api/investments/transactions/${kind}`, fields)
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
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

/** Sets the User's own Reference Price of an Asset for a day, as the price screen does. */
export async function setReferencePrice(request: APIRequestContext, assetId: number, value: string, date?: string) {
  const response = await send(request, 'PUT', `/api/investments/assets/${assetId}/price`, { value, date })
  expect(response.status()).toBe(200)
}

/** Creates one of the User's own Categories. */
export async function createCategory(request: APIRequestContext, name: string) {
  const response = await send(request, 'POST', '/api/categories', { name })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number; name: string }
}

/** Archives one of the User's own Categories. */
export async function archiveCategory(request: APIRequestContext, categoryId: number) {
  const response = await send(request, 'POST', `/api/categories/${categoryId}/archive`)
  expect(response.status()).toBe(200)
}

/** Creates a personal API token; the secret is returned this once, so callers must not print it. */
export async function createToken(request: APIRequestContext, name: string, scopes: ('finance:read' | 'movements:create')[]) {
  const response = await send(request, 'POST', '/api/settings/tokens', { name, scopes })
  expect(response.status()).toBe(201)
  return (await response.json()) as { token: { id: number }; secret: string }
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

export interface PreferenceFields {
  movement_type: string | null
  account_id: number | null
  period: 'current_month' | 'all' | 'custom'
  from: string | null
  to: string | null
  grouping: 'date' | 'type'
  visible_sections: string[]
}

export const ALL_SECTIONS = ['available', 'budgets', 'net_worth', 'upcoming', 'accounts']

/** What a User who never opened the settings screen has. */
export const INITIAL_PREFERENCES: PreferenceFields = {
  movement_type: null,
  account_id: null,
  period: 'current_month',
  from: null,
  to: null,
  grouping: 'date',
  visible_sections: ALL_SECTIONS,
}

/** Saves preferences as the settings screen does; the fields not given keep their initial value. */
export async function savePreferences(request: APIRequestContext, fields: Partial<PreferenceFields> = {}) {
  const response = await send(request, 'PUT', '/api/settings/preferences', { ...INITIAL_PREFERENCES, ...fields })
  expect(response.status()).toBe(200)
}

/** Cancels an occurrence behind the screen's back, as another tab would. */
export async function cancelOccurrence(request: APIRequestContext, occurrenceId: number) {
  const response = await send(request, 'POST', `/api/recurring-payments/occurrences/${occurrenceId}/cancel`)
  expect(response.status()).toBe(200)
}

interface DividendFields {
  account_id: number
  asset_id: number
  amount: string
  date?: string
}

export async function recordDividend(request: APIRequestContext, fields: DividendFields) {
  const response = await send(request, 'POST', '/api/investments/transactions/dividend', fields)
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}
