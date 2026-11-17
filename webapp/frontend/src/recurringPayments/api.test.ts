import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError, RequestError, SessionEndedError } from '../lib/http'
import {
  cancelOccurrence,
  confirmOccurrence,
  createRecurringPayment,
  deleteRecurringPayment,
  getOccurrence,
  getRecurringPayment,
  listRecurringPayments,
  updateRecurringPayment,
} from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const receivedOccurrence = {
  id: 11,
  recurring_payment_id: 4,
  due_date: '2026-11-05',
  status: 'overdue',
  amount: '100.00',
  account_id: 3,
  category_id: 1,
  description: 'Alquiler',
  reserved_from: '2026-11-01',
  resolved_on: null,
  resolved_at: null,
  expense_id: null,
}
const occurrence = {
  id: 11,
  recurringPaymentId: 4,
  dueDate: '2026-11-05',
  status: 'overdue',
  amount: '100.00',
  accountId: 3,
  categoryId: 1,
  description: 'Alquiler',
  reservedFrom: '2026-11-01',
  resolvedOn: null,
  resolvedAt: null,
  expenseId: null,
}
const receivedRule = {
  id: 4,
  description: 'Alquiler',
  amount: '100.00',
  account_id: 3,
  category_id: 1,
  day_of_month: 5,
  start_date: '2026-10-01',
  status: 'active',
  occurrences: [receivedOccurrence],
}
const rule = {
  id: 4,
  description: 'Alquiler',
  amount: '100.00',
  accountId: 3,
  categoryId: 1,
  dayOfMonth: 5,
  startDate: '2026-10-01',
  status: 'active',
  occurrences: [occurrence],
}
const draft = {
  description: 'Alquiler',
  amount: '100.00',
  accountId: 3,
  categoryId: 1,
  dayOfMonth: 5,
  startDate: '2026-10-01',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listRecurringPayments', () => {
  it('reads every page of rules with their occurrences', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(200, { results: [receivedRule], total: 2, page: 1, page_size: 50, next_page: 2 }))
      .mockResolvedValueOnce(
        json(200, { results: [{ ...receivedRule, id: 5, occurrences: [] }], total: 2, page: 2, page_size: 50, next_page: null }),
      )
    vi.stubGlobal('fetch', fetch)

    const rules = await listRecurringPayments()

    expect(rules).toEqual([rule, { ...rule, id: 5, occurrences: [] }])
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/recurring-payments?page_size=50&page=1',
      '/api/recurring-payments?page_size=50&page=2',
    ])
  })

  it('explains a failure and tells an ended session apart', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(listRecurringPayments()).rejects.toThrow(/conectar con Okane/)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(500, {})))
    await expect(listRecurringPayments()).rejects.toBeInstanceOf(RequestError)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, {})))
    await expect(listRecurringPayments()).rejects.toBeInstanceOf(SessionEndedError)
  })
})

describe('getRecurringPayment and getOccurrence', () => {
  it('reads one rule and one occurrence', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json(200, receivedRule)).mockResolvedValueOnce(json(200, receivedOccurrence))
    vi.stubGlobal('fetch', fetch)

    await expect(getRecurringPayment(4)).resolves.toEqual(rule)
    await expect(getOccurrence(11)).resolves.toEqual(occurrence)
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/recurring-payments/4',
      '/api/recurring-payments/occurrences/11',
    ])
  })

  it('says the record is gone when it is not the User\'s or does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(getRecurringPayment(9)).rejects.toBeInstanceOf(NotFoundError)
    await expect(getOccurrence(9)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('createRecurringPayment, updateRecurringPayment and deleteRecurringPayment', () => {
  it('sends the rule with the CSRF token and returns the one created', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, receivedRule))
    vi.stubGlobal('fetch', fetch)

    await expect(createRecurringPayment(draft, 'csrf')).resolves.toEqual({ ok: true, value: rule })

    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/recurring-payments')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('csrf')
    expect(JSON.parse(init.body)).toEqual({
      description: 'Alquiler',
      amount: '100.00',
      account_id: 3,
      category_id: 1,
      day_of_month: 5,
      start_date: '2026-10-01',
    })
  })

  it('maps the field errors of api-service to the fields of the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, { errors: { day_of_month: ['Día inválido.'], start_date: ['Fecha.'], form: ['Algo.'] } }),
      ),
    )

    await expect(createRecurringPayment(draft, 'csrf')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { dayOfMonth: ['Día inválido.'], startDate: ['Fecha.'], form: ['Algo.'] },
    })
  })

  it('replaces a rule with PUT and deletes it with DELETE', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json(200, receivedRule)).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await expect(updateRecurringPayment(4, draft, 'csrf')).resolves.toEqual({ ok: true, value: rule })
    await expect(deleteRecurringPayment(4, 'csrf')).resolves.toEqual({ ok: true, value: undefined })

    expect(fetch.mock.calls[0][0]).toBe('/api/recurring-payments/4')
    expect(fetch.mock.calls[0][1].method).toBe('PUT')
    expect(fetch.mock.calls[1][1].method).toBe('DELETE')
    expect(fetch.mock.calls[1][1].body).toBeUndefined()
  })
})

describe('confirmOccurrence and cancelOccurrence', () => {
  it('confirms with the reviewed amount, Account and date', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { ...receivedOccurrence, status: 'confirmed', expense_id: 8 }))
    vi.stubGlobal('fetch', fetch)

    await expect(
      confirmOccurrence(11, { amount: '120.00', accountId: 3, date: '2026-12-02' }, 'csrf'),
    ).resolves.toEqual({ ok: true, value: { ...occurrence, status: 'confirmed', expenseId: 8 } })

    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/recurring-payments/occurrences/11/confirm')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ amount: '120.00', account_id: 3, date: '2026-12-02' })
  })

  it('maps the errors of a confirmation and shows the 409 of an incompatible resolution', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(400, { errors: { date: ['Fecha.'], account_id: ['Cuenta.'] } })))
    await expect(confirmOccurrence(11, { amount: '1.00', accountId: 3, date: '2026-12-02' }, 'csrf')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { date: ['Fecha.'], accountId: ['Cuenta.'] },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { errors: { form: ['Ya se canceló.'] } })))
    await expect(confirmOccurrence(11, { amount: '1.00', accountId: 3, date: '2026-12-02' }, 'csrf')).resolves.toMatchObject({
      ok: false,
      errors: { form: ['Ya se canceló.'] },
    })
  })

  it('cancels with no body', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { ...receivedOccurrence, status: 'cancelled' }))
    vi.stubGlobal('fetch', fetch)

    await expect(cancelOccurrence(11, 'csrf')).resolves.toMatchObject({ ok: true, value: { status: 'cancelled' } })

    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/recurring-payments/occurrences/11/cancel')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('says so when the occurrence is gone or the session ended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, {})))
    await expect(cancelOccurrence(11, 'csrf')).resolves.toMatchObject({ ok: false, errors: { form: [expect.any(String)] } })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, {})))
    await expect(cancelOccurrence(11, 'csrf')).resolves.toMatchObject({ ok: false, sessionEnded: true })
  })
})
