import { describe, expect, it } from 'vitest'
import type { Asset, Trade, Transaction } from './api'
import { describeTransaction, formatPrice, formatUnits, tradeNotice, unitsPhrase } from './presentation'

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
  commission: '0.00',
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
  const account = { name: 'Bróker', balance: '800.00' }

  it('says what was bought and the cash left', () => {
    expect(tradeNotice('created', trade({}), asset, account)).toBe(
      'Compraste 2 unidades de AAPL por $200.00. Saldo de Bróker: $800.00.',
    )
  })

  it('warns when the purchase left the cash negative', () => {
    expect(tradeNotice('created', trade({}), asset, { name: 'Bróker', balance: '-30.00' })).toContain(
      'La compra se registró aunque la Cuenta no tenía efectivo suficiente',
    )
  })

  it('says what was sold without the cash warning', () => {
    expect(tradeNotice('created', trade({ type: 'sell' }), asset, { name: 'Bróker', balance: '-5.00' })).toBe(
      'Vendiste 2 unidades de AAPL por $200.00. Saldo de Bróker: −$5.00.',
    )
  })

  it('says a correction was saved and names the purchase', () => {
    expect(tradeNotice('updated', trade({}), asset, account)).toBe(
      'Guardaste la compra de 2 unidades de AAPL por $200.00. Saldo de Bróker: $800.00.',
    )
  })

  it('says a deletion and leaves the warning for the recording alone', () => {
    expect(tradeNotice('deleted', trade({ type: 'sell' }), asset, { name: 'Bróker', balance: '-5.00' })).toBe(
      'Eliminaste la venta de 2 unidades de AAPL por $200.00. Saldo de Bróker: −$5.00.',
    )
  })

  it('leaves the Balance out when the Account is not known', () => {
    expect(tradeNotice('deleted', trade({}), asset, undefined)).toBe(
      'Eliminaste la compra de 2 unidades de AAPL por $200.00.',
    )
  })
})

describe('describeTransaction', () => {
  const transaction: Transaction = {
    id: 1,
    type: 'buy',
    accountId: 3,
    assetId: 7,
    units: '2.50000000',
    unitPrice: '100.00000000',
    commission: '0.00',
    cashAmount: '250.00',
    date: '2026-11-10',
    asset,
  }

  it('titles a record by its Asset and tells the kind, units, price and Account', () => {
    expect(describeTransaction(transaction, 'Bróker')).toEqual({
      title: 'AAPL · Apple Inc · XNAS',
      details: 'Compra · 2.5 unidades a $100.00 · Bróker',
    })
  })

  it('adds the day on request and copes with an Account that is not known', () => {
    expect(describeTransaction({ ...transaction, type: 'sell' }, undefined, { withDate: true }).details).toBe(
      'Venta · 2.5 unidades a $100.00 · 10 nov 2026',
    )
  })
})

describe('commissions and dividends', () => {
  const dividend: Transaction = {
    id: 2,
    type: 'dividend',
    accountId: 3,
    assetId: 7,
    units: null,
    unitPrice: null,
    commission: '0.00',
    cashAmount: '12.40',
    date: '2026-11-10',
    asset,
  }

  it('describes a dividend without units or price', () => {
    expect(describeTransaction(dividend, 'Bróker').details).toBe('Dividendo · Bróker')
  })

  it('names the commission of a purchase', () => {
    const purchase: Transaction = { ...dividend, type: 'buy', units: '2.00000000', unitPrice: '100.00000000', commission: '1.50' }
    expect(describeTransaction(purchase, 'Bróker').details).toBe('Compra · 2 unidades a $100.00 · comisión $1.50 · Bróker')
  })

  it('says a dividend was registered with its Account Balance', () => {
    const notice = tradeNotice('created', trade({ type: 'dividend', units: null, unitPrice: null, cashAmount: '12.40' }), asset, {
      name: 'Bróker',
      balance: '812.40',
    })
    expect(notice).toBe('Registraste el dividendo de AAPL por $12.40. Saldo de Bróker: $812.40.')
  })
})

