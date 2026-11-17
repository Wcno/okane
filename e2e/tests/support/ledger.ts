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
  category_id?: number
  date?: string
  description?: string
}

export async function createExpense(request: APIRequestContext, fields: ExpenseFields) {
  const response = await send(request, 'POST', '/api/expenses', { amount: '10.00', category_id: 2, ...fields })
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
  date?: string
}

export async function recordTrade(request: APIRequestContext, kind: 'buy' | 'sell', fields: TradeFields) {
  const response = await send(request, 'POST', `/api/investments/transactions/${kind}`, fields)
  expect(response.status()).toBe(201)
  return (await response.json()) as { id: number }
}
