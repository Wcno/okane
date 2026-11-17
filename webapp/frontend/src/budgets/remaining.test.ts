import { describe, expect, it } from 'vitest'
import type { BudgetLine, BudgetMonth } from './api'
import { confirmationText, previewText, remainingAfter, remainingNow } from './remaining'

const line = (fields: Partial<BudgetLine>): BudgetLine => ({
  id: null,
  categoryId: 1,
  month: '2026-11',
  amount: null,
  spent: '0.00',
  committed: '0.00',
  carriedOver: '0.00',
  remaining: null,
  exceeded: false,
  ...fields,
})

const month: BudgetMonth = {
  month: '2026-11',
  lines: [
    line({ id: 1, categoryId: 2, amount: '300.00', spent: '80.00', committed: '100.00', remaining: '120.00' }),
    line({ id: 2, categoryId: 7, amount: '50.00', spent: '60.25', remaining: '-10.25', exceeded: true }),
    line({ categoryId: 3, spent: '15.00' }),
  ],
}

describe('remainingAfter', () => {
  it('takes the amount off the Restante api-service computed, committed included', () => {
    expect(remainingAfter(month, 2, '15')).toEqual({ kind: 'remaining', before: '120.00', after: '105.00' })
  })

  it('leaves exactly zero when the amount is what is left', () => {
    expect(remainingAfter(month, 2, '120.00')).toEqual({ kind: 'remaining', before: '120.00', after: '0.00' })
  })

  it('says by how much the Category is exceeded', () => {
    expect(remainingAfter(month, 2, '120.01')).toEqual({ kind: 'exceeded', before: '120.00', excess: '0.01' })
    expect(remainingAfter(month, 7, '1.00')).toEqual({ kind: 'exceeded', before: '-10.25', excess: '11.25' })
  })

  it('has no Restante for a Category without Budget, spent or not', () => {
    expect(remainingAfter(month, 3, '5.00')).toEqual({ kind: 'no-budget' })
    expect(remainingAfter(month, 8, '5.00')).toEqual({ kind: 'no-budget' })
  })
})

describe('remainingNow', () => {
  it('reads the Restante as it is', () => {
    expect(remainingNow(month, 2)).toEqual({ kind: 'remaining', before: '120.00', after: '120.00' })
    expect(remainingNow(month, 7)).toEqual({ kind: 'exceeded', before: '-10.25', excess: '10.25' })
    expect(remainingNow(month, 3)).toEqual({ kind: 'no-budget' })
  })
})

describe('texts', () => {
  it('previews the consequence before saving', () => {
    expect(previewText('Alimentación', remainingAfter(month, 2, '20'))).toBe(
      'Restante en Alimentación: de $120.00 a $100.00.',
    )
    expect(previewText('Educación', remainingAfter(month, 7, '1'))).toBe(
      'Educación quedará excedida por $11.25; el gasto se registra igual.',
    )
    expect(previewText('Transporte', remainingAfter(month, 3, '1'))).toBe(
      'Transporte no tiene Presupuesto este mes; el gasto se registra igual.',
    )
  })

  it('confirms the consequence after saving', () => {
    expect(confirmationText('Alimentación', remainingNow(month, 2))).toBe('Restante en Alimentación: $120.00.')
    expect(confirmationText('Educación', remainingNow(month, 7))).toBe('Educación queda excedida por $10.25.')
    expect(confirmationText('Transporte', remainingNow(month, 3))).toBe('Transporte no tiene Presupuesto este mes.')
  })
})
