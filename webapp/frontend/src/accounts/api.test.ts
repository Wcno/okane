import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestError, SessionEndedError } from '../lib/http'
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
} from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const received = {
  id: 7,
  name: 'Ahorro',
  type: 'savings',
  opening_balance: '400.00',
  opening_date: '2026-11-01',
  annual_interest_rate: '0.042500',
  balance: '500.00',
  has_records: true,
  archived_at: null,
}

const account = {
  id: 7,
  name: 'Ahorro',
  type: 'savings',
  openingBalance: '400.00',
  openingDate: '2026-11-01',
  annualInterestRate: '0.042500',
  balance: '500.00',
  hasRecords: true,
  archivedAt: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listAccounts', () => {
  it('reads every page of the list', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(200, { results: [received], total: 2, page: 1, page_size: 200, next_page: 2 }))
      .mockResolvedValueOnce(
        json(200, { results: [{ ...received, id: 8 }], total: 2, page: 2, page_size: 200, next_page: null }),
      )
    vi.stubGlobal('fetch', fetch)

    await expect(listAccounts()).resolves.toEqual([account, { ...account, id: 8 }])
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/accounts?page_size=200&page=1',
      '/api/accounts?page_size=200&page=2',
    ])
  })

  it('says the session ended when webapp asks to sign in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { detail: 'authentication_required' })))

    await expect(listAccounts()).rejects.toBeInstanceOf(SessionEndedError)
  })

  it('explains a failure of api-service and a lost connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(502, { status: 'unavailable', service: 'api-service' })))
    await expect(listAccounts()).rejects.toEqual(
      new RequestError('Okane no pudo consultar tus Cuentas. Espera un momento e inténtalo de nuevo.'),
    )

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(listAccounts()).rejects.toEqual(
      new RequestError('No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'),
    )
  })
})

describe('createAccount', () => {
  const newAccount = {
    name: 'Ahorro',
    type: 'savings' as const,
    openingBalance: '400.00',
    openingDate: '2026-11-01',
    annualInterestRate: '0.0425',
  }

  it('sends the Account with the CSRF token and returns the one created', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, received))
    vi.stubGlobal('fetch', fetch)

    await expect(createAccount(newAccount, 't1')).resolves.toEqual({ ok: true, value: account })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/accounts')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('t1')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Ahorro',
      type: 'savings',
      opening_balance: '400.00',
      opening_date: '2026-11-01',
      annual_interest_rate: '0.0425',
    })
  })

  it('returns the errors of each field under the names the form uses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, { errors: { opening_date: ['La fecha de inicio no puede ser futura.'], name: ['Escribe el nombre.'] } }),
      ),
    )

    await expect(createAccount(newAccount, 't1')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { openingDate: ['La fecha de inicio no puede ser futura.'], name: ['Escribe el nombre.'] },
    })
  })

  it('explains a lost connection without losing the outcome shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(createAccount(newAccount, 't1')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { form: ['No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'] },
    })
  })

  it('explains a server failure that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<h1>Bad Gateway</h1>', { status: 502 })))

    await expect(createAccount(newAccount, 't1')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { form: ['Okane no pudo guardar el cambio. Espera un momento e inténtalo de nuevo.'] },
    })
  })

  it('marks a session that ended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { detail: 'authentication_required' })))

    const outcome = await createAccount(newAccount, 't1')

    expect(outcome.ok === false && outcome.sessionEnded).toBe(true)
  })
})

describe('updateAccount', () => {
  it('sends only what stays editable', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { ...received, name: 'Meta' }))
    vi.stubGlobal('fetch', fetch)

    const outcome = await updateAccount(7, { name: 'Meta', annualInterestRate: null }, 't1')

    expect(outcome).toEqual({ ok: true, value: { ...account, name: 'Meta' } })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/accounts/7')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ name: 'Meta', annual_interest_rate: null })
  })

  it('says when the Account no longer exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(updateAccount(7, { name: 'Meta' }, 't1')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { form: ['Esta Cuenta ya no existe. Vuelve a tus Cuentas para ver la lista al día.'] },
    })
  })
})

describe('deleteAccount', () => {
  it('reports an Account without records as deleted', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await expect(deleteAccount(7, 't1')).resolves.toEqual({ ok: true, value: { result: 'deleted' } })
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
    expect(fetch.mock.calls[0][1].headers['X-CSRFToken']).toBe('t1')
  })

  it('reports an Account with records as archived', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(200, { ...received, archived_at: '2026-11-16T10:00:00-05:00' })),
    )

    await expect(deleteAccount(7, 't1')).resolves.toEqual({
      ok: true,
      value: { result: 'archived', account: { ...account, archivedAt: '2026-11-16T10:00:00-05:00' } },
    })
  })
})
