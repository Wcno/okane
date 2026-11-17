import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDashboard, getPerformance } from './portfolio'
import { getAssetPrice, saveAssetPrice } from './price'
import { distributionTone, formatPercent, priceOrigin, trendOf } from './presentation'

const assetBody = { id: 3, provider: 'sample', market: 'XNAS', symbol: 'AAPL', name: 'Apple Inc', asset_type: 'ETF', currency: 'USD' }
const price = { value: '100.00000000', source: 'last_transaction', date: '2026-11-02', estimated: true }
const account = {
  id: 1,
  name: 'Bróker',
  archived: false,
  cash: '500.00',
  positions_value: '625.00',
  value: '1125.00',
  net_contribution: '1000.00',
  return: { amount: '125.00', percent: '12.50' },
  estimated: true,
}
const portfolio = {
  as_of: '2026-11-16',
  value: '1125.00',
  cash: '500.00',
  positions_value: '625.00',
  net_contribution: '1000.00',
  return: { amount: '125.00', percent: '12.50' },
  estimated: true,
  accounts: [account],
}

const answer = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))

afterEach(() => vi.restoreAllMocks())

describe('the investments readers', () => {
  it('reads the dashboard with its distribution as decimal strings', async () => {
    const fetch = answer({
      ...portfolio,
      distribution: [{ asset: assetBody, value: '625.00', portfolio_percent: '100.00', price }],
      others_value: null,
      others_percent: null,
    })

    const dashboard = await getDashboard()

    expect(fetch.mock.calls[0][0]).toBe('/api/investments/dashboard')
    expect(dashboard.value).toBe('1125.00')
    expect(dashboard.netContribution).toBe('1000.00')
    expect(dashboard.return).toEqual({ amount: '125.00', percent: '12.50' })
    expect(dashboard.accounts[0]).toMatchObject({ positionsValue: '625.00', netContribution: '1000.00' })
    expect(dashboard.distribution[0]).toMatchObject({ portfolioPercent: '100.00', asset: { assetType: 'ETF' } })
    expect(dashboard.othersValue).toBeNull()
  })

  it('reads what each position gained against its cost', async () => {
    answer({
      ...portfolio,
      positions: [{ asset: assetBody, units: '4.00000000', cost: '400.00', value: '360.00', gain: '-40.00', gain_percent: '-10.00', price }],
      period: null,
    })

    const performance = await getPerformance()

    expect(performance.positions[0]).toMatchObject({ gain: '-40.00', gainPercent: '-10.00' })
  })

  it('reads the Return of a period when a first day is asked for', async () => {
    const fetch = answer({
      ...portfolio,
      positions: [],
      period: { from: '2026-11-06', to: '2026-11-16', opening_return: '10.00', closing_return: '15.00', return: '5.00' },
    })

    const performance = await getPerformance('2026-11-06')

    expect(fetch.mock.calls[0][0]).toBe('/api/investments/performance?from=2026-11-06')
    expect(performance.period).toEqual({ from: '2026-11-06', to: '2026-11-16', openingReturn: '10.00', closingReturn: '15.00', return: '5.00' })
  })

  it('reads an Asset without a price as null, never zero', async () => {
    answer({ asset: assetBody, price: null })

    expect((await getAssetPrice(3)).price).toBeNull()
  })

  it('sends the corrected price with the CSRF token and the day', async () => {
    const fetch = answer({ asset: assetBody, price: { ...price, source: 'manual', estimated: false } })

    const outcome = await saveAssetPrice(3, { value: '125.5', date: '2026-11-10' }, 'token')

    expect(outcome).toMatchObject({ ok: true, value: { price: { source: 'manual' } } })
    const [path, init] = fetch.mock.calls[0]
    expect(path).toBe('/api/investments/assets/3/price')
    expect(init).toMatchObject({ method: 'PUT', body: JSON.stringify({ value: '125.5', date: '2026-11-10' }) })
    expect((init!.headers as Record<string, string>)['X-CSRFToken']).toBe('token')
  })

  it('puts the field errors of a refused price on its fields', async () => {
    answer({ errors: { value: ['Escribe el precio.'] } }, 400)

    const outcome = await saveAssetPrice(3, { value: '0', date: '2026-11-10' }, 'token')

    expect(outcome).toMatchObject({ ok: false, errors: { value: ['Escribe el precio.'] } })
  })
})

describe('what the investments screens say', () => {
  it('writes a percent with its sign, and says when it does not apply', () => {
    expect(formatPercent('12.50')).toBe('+12.50 %')
    expect(formatPercent('-30.00')).toBe('−30.00 %')
    expect(formatPercent('0.00')).toBe('0.00 %')
    expect(formatPercent(null)).toBe('No aplica')
  })

  it('says where a price comes from and flags the estimate', () => {
    expect(priceOrigin({ value: '150.00000000', source: 'last_transaction', date: '2026-11-10', estimated: true })).toBe(
      'Precio $150.00 de tu última operación, 10 nov 2026 (estimado)',
    )
    expect(priceOrigin({ value: '125.50000000', source: 'manual', date: '2026-11-10', estimated: false })).toBe(
      'Precio $125.50 fijado por ti, 10 nov 2026',
    )
  })

  it('tells a gain, a loss and nothing apart', () => {
    expect([trendOf('125.00'), trendOf('-0.01'), trendOf('0.00'), trendOf('-0.00')]).toEqual(['gain', 'loss', 'flat', 'flat'])
  })

  it('gives each Asset its hue in the fixed order and the seventh onwards the neutral one', () => {
    expect([0, 1, 6, 7, 9].map(distributionTone)).toEqual([
      'var(--cat-1)',
      'var(--cat-2)',
      'var(--cat-7)',
      'var(--cat-0)',
      'var(--cat-0)',
    ])
  })
})
