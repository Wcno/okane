import { describe, expect, it } from 'vitest'
import type { Account } from '../accounts/api'
import type { Asset } from './api'
import { cashAmount, exceedsCash, tradingAccounts, validateTrade, type TradeDraft } from './form'

const asset: Asset = {
  id: 7,
  provider: 'sample',
  market: 'XNAS',
  symbol: 'AAPL',
  name: 'Apple Inc',
  assetType: 'Common Stock',
  currency: 'USD',
}

const account = (fields: Partial<Account> = {}): Account => ({
  id: 3,
  name: 'Bróker',
  type: 'investment',
  openingBalance: '1000.00',
  openingDate: '2026-01-01',
  annualInterestRate: null,
  balance: '1000.00',
  hasRecords: false,
  archivedAt: null,
  ...fields,
})

const draft = (fields: Partial<TradeDraft> = {}): TradeDraft => ({
  accountId: 3,
  asset,
  units: '2',
  unitPrice: '100',
  date: '2026-01-02',
  ...fields,
})

describe('cashAmount', () => {
  it('multiplies exactly and rounds halves away from zero to cents', () => {
    expect(cashAmount('2', '100')).toBe('200.00')
    expect(cashAmount('3', '0.835')).toBe('2.51')
    expect(cashAmount('3', '0.834')).toBe('2.50')
    expect(cashAmount('0.12345678', '1234.56789012')).toBe('152.42')
  })

  it('stays exact where a floating point number would not', () => {
    expect(cashAmount('999999999999', '999999999999')).toBe('999999999998000000000001.00')
    expect(cashAmount('0.00000001', '1')).toBe('0.00')
  })

  it('is null while a field is not a quantity', () => {
    expect(cashAmount('', '10')).toBeNull()
    expect(cashAmount('1', '1,2,3')).toBeNull()
  })
})

describe('validateTrade', () => {
  const accounts = [account()]

  it('turns a valid draft into the trade to send, with the quantities as typed in decimal strings', () => {
    expect(validateTrade(draft({ units: '0,25', unitPrice: '187.350' }), { accounts })).toEqual({
      ok: true,
      asset,
      trade: { accountId: 3, assetId: 7, units: '0.25', unitPrice: '187.35', date: '2026-01-02' },
    })
  })

  it('names each field that is wrong, in Spanish', () => {
    const outcome = validateTrade(draft({ accountId: null, asset: null, units: '0', unitPrice: 'x', date: '' }), {
      accounts,
    })

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(Object.keys(outcome.errors).sort()).toEqual(['accountId', 'assetId', 'date', 'unitPrice', 'units'])
  })

  it('rejects a ninth decimal and an operation that rounds to zero cents', () => {
    const ninth = validateTrade(draft({ units: '1.123456789' }), { accounts })
    const tiny = validateTrade(draft({ units: '0.00000001', unitPrice: '1' }), { accounts })

    expect(ninth.ok || Object.keys(ninth.errors)).toEqual(['units'])
    expect(tiny.ok || Object.keys(tiny.errors)).toEqual(['units'])
  })

  it('rejects a date after the Panama day or before the Account started', () => {
    const future = validateTrade(draft({ date: '2999-01-01' }), { accounts })
    const early = validateTrade(draft({ date: '2025-12-31' }), { accounts })

    expect(future.ok || Object.keys(future.errors)).toEqual(['date'])
    expect(early.ok || early.errors.date?.[0]).toContain('1 ene 2026')
  })
})

describe('exceedsCash', () => {
  it('warns about a purchase that takes more than the Account holds, never about a sale', () => {
    const poor = account({ balance: '50.00' })

    expect(exceedsCash('buy', '80.00', poor)).toBe(true)
    expect(exceedsCash('buy', '50.00', poor)).toBe(false)
    expect(exceedsCash('sell', '80.00', poor)).toBe(false)
    expect(exceedsCash('buy', null, poor)).toBe(false)
  })
})

describe('tradingAccounts', () => {
  it('offers investment Accounts that are not archived', () => {
    const offered = tradingAccounts([
      account({ id: 1 }),
      account({ id: 2, type: 'spending' }),
      account({ id: 3, archivedAt: '2026-02-01T00:00:00Z' }),
    ])

    expect(offered.map((item) => item.id)).toEqual([1])
  })
})
