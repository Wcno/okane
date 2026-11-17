import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../lib/http'
import { createIncome, deleteIncome, getIncome, updateIncome } from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const received = { id: 7, amount: '100.00', account_id: 3, date: '2026-11-16', description: 'Salario' }
const income = { id: 7, amount: '100.00', accountId: 3, date: '2026-11-16', description: 'Salario' }
const draft = { amount: '100.00', accountId: 3, date: '2026-11-16', description: 'Salario' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getIncome', () => {
  it('reads one Income', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await expect(getIncome(7)).resolves.toEqual(income)
    expect(fetch.mock.calls[0][0]).toBe('/api/incomes/7')
  })

  it("says the Income is gone when it is not the User's or does not exist", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(getIncome(8)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('createIncome', () => {
  it('sends the Income, with no Category, and the CSRF token and returns the one created', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, received))
    vi.stubGlobal('fetch', fetch)

    await expect(createIncome(draft, 'csrf')).resolves.toEqual({ ok: true, value: income })

    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/incomes')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('csrf')
    expect(JSON.parse(init.body)).toEqual({
      amount: '100.00',
      account_id: 3,
      date: '2026-11-16',
      description: 'Salario',
    })
  })

  it('maps the field errors of api-service to the fields of the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(400, { errors: { account_id: ['Cuenta archivada.'], form: ['Algo.'] } })),
    )

    await expect(createIncome(draft, 'csrf')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { accountId: ['Cuenta archivada.'], form: ['Algo.'] },
    })
  })

  it('says so when the Account is gone, the connection is lost or the session ended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))
    await expect(createIncome(draft, 'csrf')).resolves.toMatchObject({ ok: false, errors: { form: [expect.any(String)] } })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(createIncome(draft, 'csrf')).resolves.toMatchObject({
      ok: false,
      errors: { form: [expect.stringContaining('conectar con Okane')] },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, {})))
    await expect(createIncome(draft, 'csrf')).resolves.toMatchObject({ ok: false, sessionEnded: true })
  })
})

describe('updateIncome and deleteIncome', () => {
  it('replaces an Income with PUT', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await expect(updateIncome(7, draft, 'csrf')).resolves.toEqual({ ok: true, value: income })
    expect(fetch.mock.calls[0][0]).toBe('/api/incomes/7')
    expect(fetch.mock.calls[0][1].method).toBe('PUT')
  })

  it('deletes an Income with DELETE', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await expect(deleteIncome(7, 'csrf')).resolves.toEqual({ ok: true, value: undefined })
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
  })
})
