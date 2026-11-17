import { describe, expect, it } from 'vitest'
import type { Income } from './api'
import { savedIncomeNotice } from './notices'
import { describeIncome } from './presentation'

const income: Income = { id: 1, amount: '100.00', accountId: 1, date: '2026-11-10', description: '' }

describe('describeIncome', () => {
  it('titles an Income by its description and shows the Account', () => {
    expect(describeIncome({ ...income, description: 'Salario' }, 'Cuenta corriente')).toEqual({
      title: 'Salario',
      details: 'Cuenta corriente',
    })
  })

  it('titles an Income without a description as an Income', () => {
    expect(describeIncome(income, 'Ahorro')).toEqual({ title: 'Ingreso', details: 'Ahorro' })
  })

  it('adds the day on request and copes with an Account that is not known', () => {
    expect(describeIncome(income, undefined, { withDate: true }).details).toBe('10 nov 2026')
  })
})

describe('savedIncomeNotice', () => {
  it('confirms an Income and its effect on the Balance', () => {
    expect(savedIncomeNotice('created', income, { name: 'Cuenta corriente', balance: '1100.00' })).toBe(
      'Registraste un ingreso de $100.00. Saldo de Cuenta corriente: $1,100.00.',
    )
  })

  it('names each kind of change in Spanish and still confirms without a Balance', () => {
    expect(savedIncomeNotice('updated', income, undefined)).toBe('Guardaste un ingreso de $100.00.')
    expect(savedIncomeNotice('deleted', income, undefined)).toBe('Eliminaste un ingreso de $100.00.')
  })
})
