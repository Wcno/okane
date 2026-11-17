import { describe, expect, it } from 'vitest'
import { initialState, remainingBudget, type BudgetLine } from './sample'
import { confirmationText, previewText, recordSampleSpend, sampleRemainingAfter } from './sampleRemaining'

const budgets = initialState.budgets

describe('sampleRemainingAfter', () => {
  it('takes the amount off what is left of the sample Budget', () => {
    expect(sampleRemainingAfter(budgets, 'Alimentación', '15')).toEqual({
      kind: 'remaining',
      before: '105.65',
      after: '90.65',
    })
  })

  it('leaves exactly zero when the amount is what is left', () => {
    expect(sampleRemainingAfter(budgets, 'Educación', '60.00')).toEqual({
      kind: 'remaining',
      before: '60.00',
      after: '0.00',
    })
  })

  it('says by how much the Category is exceeded', () => {
    expect(sampleRemainingAfter(budgets, 'Educación', '70.25')).toEqual({
      kind: 'exceeded',
      before: '60.00',
      excess: '10.25',
    })
  })

  it('knows a Category without a sample Budget', () => {
    expect(sampleRemainingAfter(budgets, 'Otros', '5')).toEqual({ kind: 'no-budget' })
  })

  it('subtracts in exact cents, even past the point where binary floating point loses them', () => {
    const lines: BudgetLine[] = [{ category: 'Educación', budget: 100, spent: 0 }]

    // Number('9007199254740993.00') is 9007199254740992: a float subtraction is off by one dollar.
    expect(sampleRemainingAfter(lines, 'Educación', '9007199254740993.00')).toEqual({
      kind: 'exceeded',
      before: '100.00',
      excess: '9007199254740893.00',
    })
  })
})

describe('texts', () => {
  const remaining = { kind: 'remaining', before: '105.65', after: '90.65' } as const
  const exceeded = { kind: 'exceeded', before: '60.00', excess: '10.25' } as const

  it('previews the consequence while the form is open', () => {
    expect(previewText('Alimentación', remaining)).toBe('Restante en Alimentación: de $105.65 a $90.65.')
    expect(previewText('Educación', exceeded)).toBe(
      'Educación quedará excedida por $10.25; el gasto se registra igual.',
    )
    expect(previewText('Otros', { kind: 'no-budget' })).toBe(
      'Otros no tiene Presupuesto este mes; el gasto se registra igual.',
    )
  })

  it('confirms the consequence once the Expense is saved', () => {
    expect(confirmationText('Alimentación', remaining)).toBe('Restante en Alimentación: $90.65.')
    expect(confirmationText('Educación', exceeded)).toBe('Educación queda excedida por $10.25.')
    expect(confirmationText('Otros', { kind: 'no-budget' })).toBe('Otros no tiene Presupuesto este mes.')
  })
})

describe('recordSampleSpend', () => {
  const after = recordSampleSpend(initialState, 'Alimentación', '12.50')
  const line = (state: typeof initialState, category: string) =>
    state.budgets.find((budget) => budget.category === category) as BudgetLine

  it('adds the amount to what the Category has spent, to the cent', () => {
    expect(line(after, 'Alimentación').spent).toBe(226.85)
    expect(remainingBudget(line(after, 'Alimentación'))).toBe(93.15)
    expect(line(recordSampleSpend(initialState, 'Salud', '0.10'), 'Salud').spent).toBe(12.1)
  })

  it('leaves the other Categories, the original state and every sample Account alone', () => {
    expect(line(after, 'Transporte')).toEqual(line(initialState, 'Transporte'))
    expect(line(initialState, 'Alimentación').spent).toBe(214.35)
    expect(after.accounts).toBe(initialState.accounts)
  })

  it('accepts an amount that exceeds the Budget', () => {
    expect(remainingBudget(line(recordSampleSpend(initialState, 'Alimentación', '2000.00'), 'Alimentación'))).toBe(-1894.35)
  })
})
