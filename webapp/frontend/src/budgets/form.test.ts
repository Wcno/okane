import { describe, expect, it } from 'vitest'
import { parseBudgetAmount, validateBudget, type BudgetDraft } from './form'

const draft = (fields: Partial<BudgetDraft> = {}): BudgetDraft => ({
  categoryId: 2,
  month: '2026-11',
  amount: '300',
  ...fields,
})

describe('parseBudgetAmount', () => {
  it('takes a positive amount with up to two decimals', () => {
    expect(parseBudgetAmount('300')).toEqual({ amount: '300.00' })
    expect(parseBudgetAmount('0,5')).toEqual({ amount: '0.50' })
  })

  it('rejects zero, a negative amount and text', () => {
    expect(parseBudgetAmount('0')).toEqual({ error: 'invalid' })
    expect(parseBudgetAmount('-5')).toEqual({ error: 'invalid' })
    expect(parseBudgetAmount('abc')).toEqual({ error: 'invalid' })
  })

  it('says an amount past twelve digits is too large', () => {
    expect(parseBudgetAmount('1000000000000')).toEqual({ error: 'too-large' })
  })
})

describe('validateBudget', () => {
  it('sends the Category, the month and the amount as a decimal string', () => {
    expect(validateBudget(draft())).toEqual({
      ok: true,
      budget: { categoryId: 2, month: '2026-11', amount: '300.00' },
    })
  })

  it('asks for every missing field at once', () => {
    const outcome = validateBudget(draft({ categoryId: null, month: '', amount: '' }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(Object.keys(outcome.errors).sort()).toEqual(['amount', 'categoryId', 'month'])
  })
})
