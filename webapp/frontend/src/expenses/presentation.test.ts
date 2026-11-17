import { describe, expect, it } from 'vitest'
import type { Expense } from './api'
import { describeExpense } from './presentation'

const expense = (id: number, date: string): Expense => ({
  id,
  amount: '5.00',
  categoryId: 2,
  accountId: 1,
  date,
  description: '',
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
