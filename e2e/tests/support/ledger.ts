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
  category_id?: number
  date?: string
  description?: string
}

export async function createExpense(request: APIRequestContext, fields: ExpenseFields) {
  const response = await send(request, 'POST', '/api/expenses', { amount: '10.00', category_id: 2, ...fields })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

interface BudgetFields {
  category_id?: number
  month: string
  amount?: string
}

export async function createBudget(request: APIRequestContext, fields: BudgetFields) {
  const response = await send(request, 'POST', '/api/budgets', { category_id: 2, amount: '300.00', ...fields })
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
  category_id?: number
  day_of_month?: number
  description?: string
}

/** Creates a rule; api-service materializes its occurrences the next time the User reads financial data. */
export async function createRecurringPayment(request: APIRequestContext, fields: RecurringPaymentFields) {
  const response = await send(request, 'POST', '/api/recurring-payments', {
    amount: '500.00',
    category_id: 1,
    day_of_month: 1,
    ...fields,
  })
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}

/** Sets the User's own Reference Price of an Asset for a day, as the price screen does. */
export async function setReferencePrice(request: APIRequestContext, assetId: number, value: string, date?: string) {
  const response = await send(request, 'PUT', `/api/investments/assets/${assetId}/price`, { value, date })
  expect(response.status()).toBe(200)
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
