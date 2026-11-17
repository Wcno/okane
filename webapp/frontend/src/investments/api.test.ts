import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError, SessionEndedError } from '../lib/http'
import { deleteTrade, getTransaction, updateTrade } from './api'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const asset = { id: 7, provider: 'sample', market: 'XNAS', symbol: 'AAPL', name: 'Apple Inc', asset_type: '', currency: 'USD' }
const received = {
  id: 9,
  type: 'buy',
  account_id: 3,
  asset_id: 7,
  units: '2.00000000',
  unit_price: '100.00000000',
  commission: '0.00',
  cash_amount: '200.00',
  date: '2026-11-10',
  asset,
}
const transaction = {
  id: 9,
  type: 'buy',
  accountId: 3,
  assetId: 7,
  units: '2.00000000',
  unitPrice: '100.00000000',
  commission: '0.00',
  cashAmount: '200.00',
  date: '2026-11-10',
  asset: { id: 7, provider: 'sample', market: 'XNAS', symbol: 'AAPL', name: 'Apple Inc', assetType: '', currency: 'USD' },
}
const trade = { accountId: 3, assetId: 7, units: '2', unitPrice: '100', date: '2026-11-10' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getTransaction', () => {
  it('reads one Transaction with its Asset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, received)))

    await expect(getTransaction(9)).resolves.toEqual(transaction)
  })

  it('says the Transaction is not the User’s or no longer exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(getTransaction(9)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('ends the session when webapp no longer knows the User', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, {})))

    await expect(getTransaction(9)).rejects.toBeInstanceOf(SessionEndedError)
  })
})

describe('updateTrade', () => {
  it('sends the whole purchase or sale with the CSRF token and reads the new Balance', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { ...received, account_balance: '600.00' }))
    vi.stubGlobal('fetch', fetch)

    const outcome = await updateTrade(9, trade, 'token')

    expect(outcome).toEqual({
      ok: true,
      value: {
        id: 9,
        type: 'buy',
        accountId: 3,
        assetId: 7,
        units: '2.00000000',
        unitPrice: '100.00000000',
        commission: '0.00',
        cashAmount: '200.00',
        date: '2026-11-10',
        accountBalance: '600.00',
      },
    })
    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/investments/transactions/9')
    expect(init.method).toBe('PUT')
    expect(init.headers['X-CSRFToken']).toBe('token')
    expect(JSON.parse(init.body)).toEqual({ account_id: 3, asset_id: 7, units: '2', unit_price: '100', date: '2026-11-10' })
  })

  it('maps the refusal of a change to the field it belongs to', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(400, { errors: { units: ['No puedes guardar este cambio.'] } })),
    )

    await expect(updateTrade(9, trade, 'token')).resolves.toEqual({
      ok: false,
      sessionEnded: false,
      errors: { units: ['No puedes guardar este cambio.'] },
    })
  })
})

describe('deleteTrade', () => {
  it('sends the deletion and reports the refusal of a purchase that a sale needs as a form message', async () => {
    const fetch = vi.fn().mockResolvedValue(json(400, { errors: { form: ['No puedes eliminar esta compra.'] } }))
    vi.stubGlobal('fetch', fetch)

    const outcome = await deleteTrade(9, 'token')

    expect(fetch.mock.calls[0][1].method).toBe('DELETE')
    expect(outcome).toEqual({ ok: false, sessionEnded: false, errors: { form: ['No puedes eliminar esta compra.'] } })
  })

  it('succeeds without a body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(deleteTrade(9, 'token')).resolves.toEqual({ ok: true, value: undefined })
  })
})
