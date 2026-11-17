import { describe, expect, it } from 'vitest'
import { budgetNotice } from './notices'

describe('budgetNotice', () => {
  it('names the amount, the Category and the month', () => {
    expect(budgetNotice('created', { amount: '300.00', categoryId: 2, month: '2026-11' })).toBe(
      'Creaste un Presupuesto de $300.00 para Alimentación en Noviembre 2026.',
    )
    expect(budgetNotice('deleted', { amount: '50.00', categoryId: 7, month: '2026-10' })).toBe(
      'Eliminaste un Presupuesto de $50.00 para Educación en Octubre 2026.',
    )
  })
})
