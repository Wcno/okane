import { describe, expect, it } from 'vitest'
import { savedNotice } from './notices'

describe('savedNotice', () => {
  const expense = { amount: '12.50', categoryId: 2 }

  it('confirms an Expense and its effect on the Balance', () => {
    expect(savedNotice('created', expense, { name: 'Cuenta corriente', balance: '987.50' })).toBe(
      'Registraste un gasto de $12.50 en Alimentación. Saldo de Cuenta corriente: $987.50.',
    )
  })

  it('names each kind of change in Spanish', () => {
    expect(savedNotice('updated', expense, undefined)).toBe('Guardaste un gasto de $12.50 en Alimentación.')
  })

  it('still confirms when the Balance could not be read', () => {
    expect(savedNotice('deleted', expense, undefined)).toBe('Eliminaste un gasto de $12.50 en Alimentación.')
  })
})
