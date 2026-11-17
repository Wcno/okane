import { describe, expect, it } from 'vitest'
import type { Account } from '../accounts/api'
import type { Expense } from './api'
import { describeExpense, offeredAccounts } from './presentation'

const expense = (id: number, date: string): Expense => ({
  id,
  amount: '5.00',
  categoryId: 2,
  accountId: 1,
  date,
  description: '',
})

describe('offeredAccounts', () => {
  const account = (id: number, fields: Partial<Account>): Account => ({
    id,
    name: `Cuenta ${id}`,
    type: 'spending',
    openingBalance: '0.00',
    openingDate: '2026-11-01',
    annualInterestRate: null,
    balance: '0.00',
    hasRecords: false,
    archivedAt: null,
    ...fields,
  })

  it('offers spending and savings Accounts that are not archived', () => {
    const accounts = [
      account(1, {}),
      account(2, { type: 'savings' }),
      account(3, { type: 'investment' }),
      account(4, { archivedAt: '2026-11-10T00:00:00Z' }),
    ]

    expect(offeredAccounts(accounts).map((item) => item.id)).toEqual([1, 2])
  })

  it('keeps the Account an Expense already has, even archived, when editing it', () => {
    const archived = account(4, { archivedAt: '2026-11-10T00:00:00Z' })

    expect(offeredAccounts([account(1, {}), archived], 4).map((item) => item.id)).toEqual([1, 4])
  })
})

describe('describeExpense', () => {
  const described = { ...expense(1, '2026-11-10'), description: 'Supermercado' }

  it('titles an Expense by its description and keeps the Category in the details', () => {
    expect(describeExpense(described, 'Cuenta corriente')).toEqual({
      title: 'Supermercado',
      details: 'Alimentación · Cuenta corriente',
    })
  })

  it('titles an Expense without description by its Category', () => {
    expect(describeExpense(expense(1, '2026-11-10'), 'Ahorro')).toEqual({ title: 'Alimentación', details: 'Ahorro' })
  })

  it('adds the day on request and copes with an Account that is not known', () => {
    expect(describeExpense(described, undefined, { withDate: true }).details).toBe('Alimentación · 10 nov 2026')
  })
})
