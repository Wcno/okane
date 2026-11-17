import { afterEach, describe, expect, it, vi } from 'vitest'
import { getNetWorthHistory } from './api'

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => vi.unstubAllGlobals())

describe('getNetWorthHistory', () => {
  it('maps each period and keeps amounts as exact decimal strings', async () => {
    const fetch = vi.fn().mockResolvedValue(
      json({
        as_of: '2026-11-16',
        periods: [
          {
            month: '2026-11',
            opening_cut: '2026-10-31',
            closing_cut: '2026-11-16',
            opening_net_worth: '2100.00',
            net_worth: '2200.10',
            opening_balances_added: '0.00',
            net_savings: '150.00',
            return: '-49.90',
            estimated: true,
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetch)

    const [period] = await getNetWorthHistory()

    expect(fetch.mock.calls[0][0]).toBe('/api/net-worth/history')
    expect(period).toEqual({
      month: '2026-11',
      openingCut: '2026-10-31',
      closingCut: '2026-11-16',
      openingNetWorth: '2100.00',
      netWorth: '2200.10',
      openingBalancesAdded: '0.00',
      netSavings: '150.00',
      periodReturn: '-49.90',
      estimated: true,
    })
  })
})
