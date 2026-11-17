import { describe, expect, it } from 'vitest'
import type { Account } from '../accounts/api'
import { savedTransferNotice } from './notices'
import { describeTransfer, startOfRecords, transferAccounts } from './presentation'
import type { Transfer } from './api'

const account = (id: number, fields: Partial<Account> = {}): Account => ({
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

const transfer = (fields: Partial<Transfer> = {}): Transfer => ({
  id: 1,
  amount: '250.00',
  sourceAccountId: 1,
  destinationAccountId: 2,
  date: '2026-11-16',
  description: '',
  ...fields,
})

describe('transferAccounts', () => {
  it('offers every type that is not archived, investment included', () => {
    const accounts = [
      account(1),
      account(2, { type: 'savings' }),
      account(3, { type: 'investment' }),
      account(4, { archivedAt: '2026-11-10T00:00:00Z' }),
    ]

    expect(transferAccounts(accounts).map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('keeps the archived Accounts a Transfer already has when editing it', () => {
    const accounts = [account(1), account(4, { archivedAt: '2026-11-10T00:00:00Z' })]

    expect(transferAccounts(accounts, [4]).map((item) => item.id)).toEqual([1, 4])
  })
})

describe('startOfRecords', () => {
  it('is the later opening day of the two Accounts, whatever their order', () => {
    const accounts = [account(1, { openingDate: '2026-11-01' }), account(2, { openingDate: '2026-11-10' })]

    expect(startOfRecords(accounts, [1, 2])).toBe('2026-11-10')
    expect(startOfRecords(accounts, [2, 1])).toBe('2026-11-10')
  })

  it('ignores an Account that is not offered and says nothing when neither is', () => {
    const accounts = [account(1, { openingDate: '2026-11-01' })]

    expect(startOfRecords(accounts, [1, 9])).toBe('2026-11-01')
    expect(startOfRecords(accounts, [null, 9])).toBeUndefined()
  })
})

describe('describeTransfer', () => {
  const byId = new Map([account(1), account(2), account(3, { type: 'investment' })].map((item) => [item.id, item]))

  it('is called by its route when it has no description', () => {
    expect(describeTransfer(transfer(), byId)).toEqual({
      title: 'Cuenta 1 → Cuenta 2',
      details: '',
    })
  })

  it('shows the description first and the route as a detail', () => {
    expect(describeTransfer(transfer({ description: 'Ahorro' }), byId, { withDate: true })).toMatchObject({
      title: 'Ahorro',
      details: 'Cuenta 1 → Cuenta 2 · 16 nov 2026',
    })
  })

  it('names a Transfer into an investment Account an Aporte', () => {
    expect(describeTransfer(transfer({ destinationAccountId: 3 }), byId).details).toBe('Aporte')
  })
})

describe('savedNotice', () => {
  const source = { name: 'Corriente', balance: '750.00', type: 'spending' as const }
  const savings = { name: 'Ahorro', balance: '550.00', type: 'savings' as const }
  const broker = { name: 'Bróker', balance: '1250.00', type: 'investment' as const }

  it('confirms a Transfer and both Balances', () => {
    expect(savedTransferNotice('created', { amount: '250.00' }, [source, savings])).toBe(
      'Registraste una transferencia de $250.00 de Corriente a Ahorro. Saldo de Corriente: $750.00. Saldo de Ahorro: $550.00.',
    )
  })

  it('calls a Transfer into an investment Account an aporte', () => {
    expect(savedTransferNotice('created', { amount: '250.00' }, [source, broker])).toContain('Registraste un aporte de $250.00')
  })

  it('still confirms when the Balances could not be read', () => {
    expect(savedTransferNotice('deleted', { amount: '250.00' }, [undefined, undefined])).toBe('Eliminaste una transferencia de $250.00.')
  })
})
