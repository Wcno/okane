import { describe, expect, it } from 'vitest'
import type { Account } from '../accounts/api'
import type { Expense } from './api'
import { dayHeading, describeExpense, groupByDay, offeredAccounts } from './presentation'

const expense = (id: number, date: string): Expense => ({
  id,
  amount: '5.00',
  categoryId: 2,
  accountId: 1,
  date,
  description: '',
})

describe('dayHeading', () => {
  it('names today and yesterday and writes any other day out', () => {
    expect(dayHeading('2026-11-16', '2026-11-16')).toBe('Hoy')
    expect(dayHeading('2026-11-15', '2026-11-16')).toBe('Ayer')
    expect(dayHeading('2026-11-09', '2026-11-16')).toBe('lun 9 nov')
  })

  it('adds the year to a day of another year', () => {
    expect(dayHeading('2025-12-31', '2026-11-16')).toBe('mié 31 dic 2025')
  })

  it('names yesterday across a month boundary', () => {
    expect(dayHeading('2026-10-31', '2026-11-01')).toBe('Ayer')
  })
})

describe('groupByDay', () => {
  it('keeps the order and starts a group whenever the day changes', () => {
    const groups = groupByDay([expense(4, '2026-11-16'), expense(3, '2026-11-16'), expense(2, '2026-11-10')])

    expect(groups.map((group) => [group.date, group.expenses.map((item) => item.id)])).toEqual([
      ['2026-11-16', [4, 3]],
      ['2026-11-10', [2]],
    ])
  })

  it('is empty for no Expenses', () => {
    expect(groupByDay([])).toEqual([])
  })
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
