import { describe, expect, it } from 'vitest'
import type { Asset, Trade } from './api'
import { formatPrice, formatUnits, tradeNotice, unitsPhrase } from './presentation'

const asset: Asset = {
  id: 7,
  provider: 'sample',
  market: 'XNAS',
  symbol: 'AAPL',
  name: 'Apple Inc',
  assetType: '',
  currency: 'USD',
}

const trade = (fields: Partial<Trade>): Trade => ({
  id: 1,
  type: 'buy',
  accountId: 3,
  assetId: 7,
  units: '2.00000000',
  unitPrice: '100.00000000',
  cashAmount: '200.00',
  date: '2026-01-02',
  accountBalance: '800.00',
  ...fields,
})

describe('quantities', () => {
  it('drops trailing zeros from units and keeps at least cents in a price', () => {
    expect(formatUnits('2.50000000')).toBe('2.5')
    expect(formatUnits('10.00000000')).toBe('10')
    expect(formatPrice('187.35000000')).toBe('$187.35')
    expect(formatPrice('0.12345678')).toBe('$0.12345678')
    expect(formatPrice('1234.50000000')).toBe('$1,234.50')
    expect(unitsPhrase('1.00000000')).toBe('1 unidad')
    expect(unitsPhrase('0.25000000')).toBe('0.25 unidades')
  })
})

describe('tradeNotice', () => {
  it('says what was bought and the cash left', () => {
    expect(tradeNotice(trade({}), asset, { name: 'Bróker' })).toBe(
      'Compraste 2 unidades de AAPL por $200.00. Saldo de Bróker: $800.00.',
    )
  })

  it('warns when the purchase left the cash negative', () => {
    expect(tradeNotice(trade({ accountBalance: '-30.00' }), asset, { name: 'Bróker' })).toContain(
      'La compra se registró aunque la Cuenta no tenía efectivo suficiente',
    )
  })

  it('says what was sold without the cash warning', () => {
    expect(tradeNotice(trade({ type: 'sell', accountBalance: '-5.00' }), asset, { name: 'Bróker' })).toBe(
      'Vendiste 2 unidades de AAPL por $200.00. Saldo de Bróker: −$5.00.',
    )
  })
})
