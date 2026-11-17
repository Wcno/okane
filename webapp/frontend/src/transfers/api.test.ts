import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../lib/http'
import { createTransfer, deleteTransfer, getTransfer, updateTransfer } from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const received = {
  id: 7,
  amount: '250.00',
  source_account_id: 3,
  destination_account_id: 4,
  date: '2026-11-16',
  description: 'Ahorro',
}
const transfer = {
  id: 7,
  amount: '250.00',
  sourceAccountId: 3,
  destinationAccountId: 4,
  date: '2026-11-16',
  description: 'Ahorro',
}
const draft = {
  amount: '250.00',
  sourceAccountId: 3,
  destinationAccountId: 4,
  date: '2026-11-16',
  description: 'Ahorro',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getTransfer', () => {
  it('reads one Transfer', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await expect(getTransfer(7)).resolves.toEqual(transfer)
    expect(fetch.mock.calls[0][0]).toBe('/api/transfers/7')
  })

  it("says the Transfer is gone when it is not the User's or does not exist", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(getTransfer(8)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('createTransfer', () => {
  it('sends both Accounts with the CSRF token and returns the Transfer created', async () => {
    const fetch = vi.fn().mockResolvedValue(json(201, received))
    vi.stubGlobal('fetch', fetch)

    await expect(createTransfer(draft, 'csrf')).resolves.toEqual({ ok: true, value: transfer })

    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/transfers')
    expect(init.method).toBe('POST')
    expect(init.headers['X-CSRFToken']).toBe('csrf')
    expect(JSON.parse(init.body)).toEqual({
      amount: '250.00',
      source_account_id: 3,
      destination_account_id: 4,
      date: '2026-11-16',
      description: 'Ahorro',
    })
  })

  it('maps the field errors of api-service to the fields of the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, { errors: { destination_account_id: ['Distintas.'], source_account_id: ['Elige.'], form: ['Algo.'] } }),
      ),
    )

    await expect(createTransfer(draft, 'csrf')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { destinationAccountId: ['Distintas.'], sourceAccountId: ['Elige.'], form: ['Algo.'] },
    })
  })

  it('says so when an Account is gone, the connection is lost or the session ended', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))
    await expect(createTransfer(draft, 'csrf')).resolves.toMatchObject({ ok: false, errors: { form: [expect.any(String)] } })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(createTransfer(draft, 'csrf')).resolves.toMatchObject({
      ok: false,
      errors: { form: [expect.stringContaining('conectar con Okane')] },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, {})))
    await expect(createTransfer(draft, 'csrf')).resolves.toMatchObject({ ok: false, sessionEnded: true })
  })
})

describe('updateTransfer and deleteTransfer', () => {
  it('replaces a Transfer with PUT', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, received))
    vi.stubGlobal('fetch', fetch)

    await expect(updateTransfer(7, draft, 'csrf')).resolves.toEqual({ ok: true, value: transfer })
    expect(fetch.mock.calls[0][0]).toBe('/api/transfers/7')
    expect(fetch.mock.calls[0][1].method).toBe('PUT')
  })

  it('deletes a Transfer with DELETE', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await expect(deleteTransfer(7, 'csrf')).resolves.toEqual({ ok: true, value: undefined })
    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
    expect(fetch.mock.calls[0][1].body).toBeUndefined()
  })
})
