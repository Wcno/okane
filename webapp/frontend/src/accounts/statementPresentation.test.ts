import { describe, expect, it } from 'vitest'
import type { Account } from './api'
import type { StatementLine } from './statement'
import { describeMovement, describeOpening, lineLink } from './statementPresentation'

const line = (fields: Partial<StatementLine>): StatementLine & { kind: Exclude<StatementLine['kind'], 'opening'> } =>
  ({
    id: 2,
    kind: 'income',
    recordId: 11,
    date: '2026-11-02',
    description: '',
    amount: '500.00',
    balance: '1500.00',
    categoryId: null,
    counterpartAccountId: null,
    asset: null,
    units: null,
    commission: null,
    ...fields,
  }) as StatementLine & { kind: Exclude<StatementLine['kind'], 'opening'> }

const accounts = new Map([[5, { id: 5, name: 'Ahorro' } as Account]])

describe('describeMovement', () => {
  it('names an income by its description and says it is an Ingreso', () => {
    expect(describeMovement(line({ description: 'Quincena' }), accounts)).toEqual({
      title: 'Quincena',
      details: 'Ingreso',
    })
  })

  it('names an Expense by its Category when it has no description', () => {
    expect(describeMovement(line({ kind: 'expense', categoryId: 1 }), accounts)).toEqual({
      title: expect.any(String),
      details: '',
    })
  })

  it('says where a Transfer went or came from', () => {
    expect(describeMovement(line({ kind: 'transfer_out', counterpartAccountId: 5 }), accounts).title).toBe(
      'Transferencia a Ahorro',
    )
    expect(describeMovement(line({ kind: 'transfer_in', counterpartAccountId: 5 }), accounts).title).toBe(
      'Transferencia de Ahorro',
    )
  })

  it('describes a purchase by its Asset and units', () => {
    expect(
      describeMovement(
        line({ kind: 'buy', asset: { symbol: 'AAPL', name: 'Apple Inc' }, units: '2.50000000', amount: '-31.00' }),
        accounts,
      ),
    ).toEqual({ title: 'Compra de AAPL', details: 'Apple Inc · 2.5 unidades' })
  })
})

describe('dividends and commissions', () => {
  it('names a Dividend by its Asset, with no units', () => {
    expect(
      describeMovement(line({ kind: 'dividend', asset: { symbol: 'AAPL', name: 'Apple Inc' }, amount: '4.20' }), accounts),
    ).toEqual({ title: 'Dividendo de AAPL', details: 'Apple Inc' })
  })

  it('shows the commission a trade paid, inside its amount', () => {
    const details = describeMovement(
      line({ kind: 'buy', asset: { symbol: 'AAPL', name: 'Apple Inc' }, units: '2.00000000', commission: '1.50' }),
      accounts,
    ).details
    expect(details).toBe('Apple Inc · 2 unidades · Comisión $1.50')
  })
})

describe('describeOpening', () => {
  it('shows the opening date', () => {
    expect(describeOpening(line({ kind: 'income', date: '2026-11-01' }))).toEqual({
      title: 'Saldo inicial',
      details: '1 nov 2026',
    })
  })
})

describe('lineLink', () => {
  it('leads to the screen that edits the movement behind the line', () => {
    expect(lineLink(line({ kind: 'expense', recordId: 4 }))).toEqual({ to: '/expenses/4/edit', action: 'Editar gasto' })
    expect(lineLink(line({ kind: 'transfer_in', recordId: 6 })).to).toBe('/transfers/6/edit')
    expect(lineLink(line({ kind: 'sell', recordId: 8 })).to).toBe('/investments/transactions/8/edit')
  })
})
