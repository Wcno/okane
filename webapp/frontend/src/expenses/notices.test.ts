import { describe, expect, it } from 'vitest'
import { balanceSentence, savedNotice } from './notices'

describe('balanceSentence', () => {
  it('says the Balance of the Account', () => {
    expect(balanceSentence({ name: 'Cuenta corriente', balance: '987.50' })).toBe('Saldo de Cuenta corriente: $987.50.')
  })

  it('points out a negative Balance without blocking anything', () => {
    expect(balanceSentence({ name: 'Tarjeta', balance: '-15.00' })).toBe('Saldo de Tarjeta: −$15.00. Quedó en negativo.')
  })

  it('says nothing when the Account is not known', () => {
    expect(balanceSentence(undefined)).toBe('')
  })
})

describe('savedNotice', () => {
  const expense = { amount: '12.50', categoryId: 2 }

  it('confirms an Expense and its effect on the Balance', () => {
    expect(savedNotice('Registraste', expense, { name: 'Cuenta corriente', balance: '987.50' })).toBe(
      'Registraste un gasto de $12.50 en Alimentación. Saldo de Cuenta corriente: $987.50.',
    )
  })

  it('still confirms when the Balance could not be read', () => {
    expect(savedNotice('Eliminaste', expense, undefined)).toBe('Eliminaste un gasto de $12.50 en Alimentación.')
  })
})
