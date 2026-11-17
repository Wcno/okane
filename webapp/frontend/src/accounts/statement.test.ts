import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../lib/http'
import { listStatement } from './statement'

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listStatement', () => {
  it('reads a page oldest first with signed amounts and balances kept as decimal strings', async () => {
    const fetch = vi.fn().mockResolvedValue(
      json(200, {
        results: [
          {
            id: 3,
            kind: 'transfer_out',
            record_id: 9,
            date: '2026-11-04',
            description: '',
            amount: '-300.00',
            balance: '1079.90',
            counterpart_account_id: 5,
          },
          {
            id: 2,
            kind: 'buy',
            record_id: 4,
            date: '2026-11-03',
            description: '',
            amount: '-31.00',
            balance: '1379.90',
            asset: { symbol: 'AAPL', name: 'Apple' },
            units: '3.00000000',
          },
        ],
        total: 4,
        page: 1,
        page_size: 50,
        next_page: 2,
      }),
    )
    vi.stubGlobal('fetch', fetch)

    const page = await listStatement(8, 1)

    expect(fetch.mock.calls[0][0]).toBe('/api/accounts/8/statement?order=asc&page_size=50&page=1')
    expect(page.total).toBe(4)
    expect(page.nextPage).toBe(2)
    expect(page.records[0]).toMatchObject({
      id: 3,
      kind: 'transfer_out',
      recordId: 9,
      amount: '-300.00',
      balance: '1079.90',
      counterpartAccountId: 5,
      asset: null,
      commission: null,
    })
    expect(page.records[1]).toMatchObject({ asset: { symbol: 'AAPL', name: 'Apple' }, units: '3.00000000' })
  })

  it('throws NotFoundError for an Account that is not the Users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(404, { detail: 'not_found' })))

    await expect(listStatement(8, 1)).rejects.toBeInstanceOf(NotFoundError)
  })
})
