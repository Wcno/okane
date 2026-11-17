import { describe, expect, it } from 'vitest'
import type { Account } from '../accounts/api'
import type { Movement } from './api'
import { describeMovement } from './presentation'

const account = (id: number, name: string, type: Account['type'] = 'spending'): Account => ({
  id,
  name,
  type,
  openingBalance: '0.00',
  openingDate: '2026-01-01',
  annualInterestRate: null,
  balance: '0.00',
  hasRecords: true,
  archivedAt: null,
})
const accounts = new Map([account(3, 'Corriente'), account(4, 'Bróker', 'investment')].map((item) => [item.id, item]))

describe('describeMovement', () => {
  it('names the type of an Expense, an Income and a Transfer, and links to their own edit screens', () => {
    const expense: Movement = {
      type: 'expense',
      id: 5,
      date: '2026-11-04',
      record: { id: 5, date: '2026-11-04', amount: '12.50', accountId: 3, categoryId: 2, description: '', recurringPaymentOccurrenceId: null },
    }
    const income: Movement = {
      type: 'income',
      id: 5,
      date: '2026-11-04',
      record: { id: 5, date: '2026-11-04', amount: '40.00', accountId: 3, description: 'Salario' },
    }
    const transfer: Movement = {
      type: 'transfer',
      id: 5,
      date: '2026-11-04',
      record: { id: 5, date: '2026-11-04', amount: '25.00', sourceAccountId: 3, destinationAccountId: 4, description: '' },
    }

    expect(describeMovement(expense, accounts)).toMatchObject({ details: 'Gasto · Corriente', to: '/expenses/5/edit', action: 'Editar gasto', amount: '12.50' })
    expect(describeMovement(income, accounts)).toMatchObject({ title: 'Salario', details: 'Ingreso · Corriente', to: '/incomes/5/edit' })
    expect(describeMovement(transfer, accounts)).toMatchObject({
      title: 'Corriente → Bróker',
      details: 'Transferencia · Aporte',
      to: '/transfers/5/edit',
      action: 'Editar transferencia',
    })
  })

  it('lets a purchase, a sale and a Dividend say their own type and open the Transaction screen', () => {
    const asset = { id: 7, provider: 'sample', market: 'XNAS', symbol: 'AAPL', name: 'Apple Inc', assetType: '', currency: 'USD' }
    const dividend: Movement = {
      type: 'dividend',
      id: 9,
      date: '2026-11-04',
      record: {
        id: 9,
        date: '2026-11-04',
        type: 'dividend',
        asset,
        assetId: 7,
        accountId: 4,
        cashAmount: '3.25',
        units: null,
        unitPrice: null,
        commission: '0.00',
      },
    }

    expect(describeMovement(dividend, accounts)).toEqual({
      title: 'AAPL · Apple Inc · XNAS',
      details: 'Dividendo · Bróker',
      amount: '3.25',
      to: '/investments/transactions/9/edit',
      action: 'Editar dividendo',
    })
  })
})
