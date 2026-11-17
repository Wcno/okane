import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../lib/http'
import { listMovements, movementKey } from './api'

const none = { types: [], accountId: null, from: '', to: '' }

const base = {
  destination_account_id: null,
  category_id: null,
  description: '',
  asset: null,
  units: null,
  unit_price: null,
  commission: null,
}
const asset = { id: 7, provider: 'sample', market: 'XNAS', symbol: 'AAPL', name: 'Apple Inc', asset_type: '', currency: 'USD' }

function answer(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(body ?? {}), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listMovements', () => {
  it('turns each kind of line into the record of its own kind, keeping amounts as strings', async () => {
    answer(200, {
      total: 4,
      next_page: null,
      results: [
        { ...base, type: 'expense', id: 1, date: '2026-11-04', amount: '0.10', account_id: 3, category_id: 2, description: 'Pan' },
        { ...base, type: 'transfer', id: 1, date: '2026-11-03', amount: '25.00', account_id: 3, destination_account_id: 4 },
        { ...base, type: 'income', id: 1, date: '2026-11-02', amount: '999999999999.99', account_id: 3 },
        { ...base, type: 'buy', id: 1, date: '2026-11-01', amount: '200.00', account_id: 5, asset, units: '2.00000000', unit_price: '100.00000000', commission: '1.50' },
      ],
    })

    const page = await listMovements(none, 1)

    expect(page.total).toBe(4)
    expect(page.nextPage).toBeNull()
    expect(page.records.map(movementKey)).toEqual(['expense-1', 'transfer-1', 'income-1', 'buy-1'])
    const [expense, transfer, income, buy] = page.records
    expect(expense.type === 'expense' && expense.record).toMatchObject({ amount: '0.10', categoryId: 2, accountId: 3, description: 'Pan' })
    expect(transfer.type === 'transfer' && transfer.record).toMatchObject({ sourceAccountId: 3, destinationAccountId: 4 })
    expect(income.type === 'income' && income.record.amount).toBe('999999999999.99')
    expect(buy.type === 'buy' && buy.record).toMatchObject({
      cashAmount: '200.00',
      commission: '1.50',
      unitPrice: '100.00000000',
      asset: { symbol: 'AAPL', market: 'XNAS' },
    })
  })

  it('sends only the filters that are set', async () => {
    const fetchMock = answer(200, { results: [], total: 0, next_page: null })

    await listMovements({ types: ['income', 'sell'], accountId: 3, from: '2026-11-01', to: '2026-11-30' }, 2)
    await listMovements(none, 1)

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/movements?page_size=50&page=2&type=income&type=sell&account_id=3&from=2026-11-01&to=2026-11-30',
    )
    expect(fetchMock.mock.calls[1][0]).toBe('/api/movements?page_size=50&page=1')
  })

  it('says the Account is gone when it is not the User\'s', async () => {
    answer(404, { detail: 'not_found' })

    await expect(listMovements({ ...none, accountId: 9 }, 1)).rejects.toBeInstanceOf(NotFoundError)
  })
})
