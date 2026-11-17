import { describe, expect, it } from 'vitest'
import type { Account } from './api'
import { balanceSentence, offeredAccounts } from './presentation'

describe('offeredAccounts', () => {
  const account = (id: number, fields: Partial<Account>): Account => ({
    id,
    name: `Cuenta ${id}`,
    type: 'spending',
    openingBalance: '0.00',
    openingDate: '2026-11-01',
    annualInterestRate: null,
    balance: '0.00',
    hasRecords: false,
    archivedAt: null,
    ...fields,
  })

  it('offers spending and savings Accounts that are not archived', () => {
    const accounts = [
      account(1, {}),
      account(2, { type: 'savings' }),
      account(3, { type: 'investment' }),
      account(4, { archivedAt: '2026-11-10T00:00:00Z' }),
    ]

    expect(offeredAccounts(accounts).map((item) => item.id)).toEqual([1, 2])
  })

  it('keeps the Account a record already has, even archived, when editing it', () => {
    const archived = account(4, { archivedAt: '2026-11-10T00:00:00Z' })

    expect(offeredAccounts([account(1, {}), archived], 4).map((item) => item.id)).toEqual([1, 4])
  })
})

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
