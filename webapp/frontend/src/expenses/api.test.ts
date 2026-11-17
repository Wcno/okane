import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError, RequestError, SessionEndedError } from '../lib/http'
import { createExpense, deleteExpense, getExpense, listExpenses, updateExpense } from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const received = {
  id: 7,
  amount: '12.50',
  category_id: 2,
  account_id: 3,
  date: '2026-11-16',
  description: 'Supermercado',
}
const expense = {
  id: 7,
  amount: '12.50',
  categoryId: 2,
  accountId: 3,
  date: '2026-11-16',
  description: 'Supermercado',
}
const draft = { amount: '12.50', categoryId: 2, accountId: 3, date: '2026-11-16', description: 'Supermercado' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listExpenses', () => {
  it('reads one page with its total, the next page and the last Account used', async () => {
    const fetch = vi.fn().mockResolvedValue(
      json(200, { results: [received], total: 51, page: 1, page_size: 50, next_page: 2, last_used_account_id: 3 }),
    )
    vi.stubGlobal('fetch', fetch)

    await expect(listExpenses(1)).resolves.toEqual({
      expenses: [expense],
      total: 51,
      nextPage: 2,
      lastUsedAccountId: 3,
    })
    expect(fetch.mock.calls[0][0]).toBe('/api/expenses?page_size=50&page=1')
  })

  it('asks for the page size it is given', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(json(200, { results: [], total: 0, page: 1, page_size: 1, next_page: null, last_used_account_id: null }))
    vi.stubGlobal('fetch', fetch)

    await listExpenses(1, 1)

    expect(fetch.mock.calls[0][0]).toBe('/api/expenses?page_size=1&page=1')
  })

  it('explains a failure and tells an ended session apart', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(listExpenses(1)).rejects.toThrow(/conectar con Okane/)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(500, {})))
    await expect(listExpenses(1)).rejects.toBeInstanceOf(RequestError)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { detail: 'authentication_required' })))
    await expect(listExpenses(1)).rejects.toBeInstanceOf(SessionEndedError)
  })
})

describe('getExpense', () => {
  it('reads one Expense', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await expect(getExpense(7)).resolves.toEqual(expense)
    expect(fetch.mock.calls[0][0]).toBe('/api/expenses/7')
  })

  it('says the Expense is gone when it is not the User\'s or does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(getExpense(8)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('createExpense', () => {
  it('sends the Expense with the CSRF token and returns the one created', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, received))
    vi.stubGlobal('fetch', fetch)

    await expect(createExpense(draft, 'csrf')).resolves.toEqual({ ok: true, value: expense })

    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/expenses')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('csrf')
    expect(JSON.parse(init.body)).toEqual({
      amount: '12.50',
      category_id: 2,
      account_id: 3,
      date: '2026-11-16',
      description: 'Supermercado',
    })
  })

  it('maps the field errors of api-service to the fields of the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, { errors: { account_id: ['Cuenta archivada.'], category_id: ['Elige.'], form: ['Algo.'] } }),
      ),
    )

    await expect(createExpense(draft, 'csrf')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { accountId: ['Cuenta archivada.'], categoryId: ['Elige.'], form: ['Algo.'] },
    })
  })

  it('says so when the Account is gone, the connection is lost or the session ended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))
    await expect(createExpense(draft, 'csrf')).resolves.toMatchObject({ ok: false, errors: { form: [expect.any(String)] } })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(createExpense(draft, 'csrf')).resolves.toMatchObject({
      ok: false,
      errors: { form: [expect.stringContaining('conectar con Okane')] },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, {})))
    await expect(createExpense(draft, 'csrf')).resolves.toMatchObject({ ok: false, sessionEnded: true })
  })
})

describe('updateExpense and deleteExpense', () => {
  it('replaces an Expense with PUT', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await expect(updateExpense(7, draft, 'csrf')).resolves.toEqual({ ok: true, value: expense })
    expect(fetch.mock.calls[0][0]).toBe('/api/expenses/7')
    expect(fetch.mock.calls[0][1].method).toBe('PUT')
  })

  it('deletes an Expense with DELETE', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await expect(deleteExpense(7, 'csrf')).resolves.toEqual({ ok: true, value: undefined })
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
    expect(fetch.mock.calls[0][1].body).toBeUndefined()
  })
})
