import { describe, expect, it } from 'vitest'
import { validateBudget, type BudgetDraft } from './form'

const draft = (fields: Partial<BudgetDraft> = {}): BudgetDraft => ({
  categoryId: 2,
  month: '2026-11',
  amount: '300',
  ...fields,
})

describe('validateBudget', () => {
  it('sends the Category, the month and the amount as a decimal string', () => {
    expect(validateBudget(draft())).toEqual({
      ok: true,
      value: { categoryId: 2, month: '2026-11', amount: '300.00' },
    })
  })

  it('rejects zero, a negative amount and text', () => {
    for (const amount of ['0', '-5', 'abc']) {
      const outcome = validateBudget(draft({ amount }))
      expect(outcome.ok).toBe(false)
    }
  })

  it('asks for every missing field at once', () => {
    const outcome = validateBudget(draft({ categoryId: null, month: '', amount: '' }))
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(Object.keys(outcome.errors).sort()).toEqual(['amount', 'categoryId', 'month'])
  })
})
