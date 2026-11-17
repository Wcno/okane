import { describe, expect, it } from 'vitest'
import type { Budget, BudgetLine } from './api'
import { describeBudget, unbudgetedWithSpending } from './presentation'

const budget = (fields: Partial<Budget> = {}): Budget => ({
  id: 1,
  categoryId: 2,
  month: '2026-11',
  amount: '300.00',
  spent: '80.00',
  committed: '0.00',
  carriedOver: '0.00',
  remaining: '220.00',
  exceeded: false,
  ...fields,
})

describe('describeBudget', () => {
  it('says what was spent of the Budget', () => {
    expect(describeBudget(budget())).toEqual({ title: 'Alimentación', details: 'Gastado $80.00 de $300.00' })
  })

  it('shows the carry-over apart from the payments reserved in the month', () => {
    const { details } = describeBudget(budget({ committed: '140.00', carriedOver: '40.00', remaining: '80.00' }))
    expect(details).toBe('Gastado $80.00 de $300.00 · Comprometido $100.00 · Arrastre $40.00')
  })

  it('leads with how much a Category is exceeded', () => {
    const { details } = describeBudget(budget({ remaining: '-20.00', exceeded: true, spent: '320.00' }))
    expect(details).toBe('Excedida por $20.00 · Gastado $320.00 de $300.00')
  })
})

describe('unbudgetedWithSpending', () => {
  it('keeps only the Categories without Budget that spent something', () => {
    const lines: BudgetLine[] = [
      budget(),
      { ...budget(), id: null, categoryId: 3, amount: null, remaining: null, spent: '15.00' },
      { ...budget(), id: null, categoryId: 4, amount: null, remaining: null, spent: '0.00' },
    ]
    expect(unbudgetedWithSpending(lines).map((line) => line.categoryId)).toEqual([3])
  })
})
