import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../accounts/api'
import { chooseDefaultAccounts, typedAmount, validateTransfer, type TransferDraft } from './form'

const account = (id: number, fields: Partial<Account> = {}): Account => ({
  id,
  name: `Cuenta ${id}`,
  type: 'spending',
  openingBalance: '1000.00',
  openingDate: '2026-11-01',
  annualInterestRate: null,
  balance: '1000.00',
  hasRecords: false,
  archivedAt: null,
  ...fields,
})

const draft = (fields: Partial<TransferDraft> = {}): TransferDraft => ({
  amount: '250.00',
  sourceAccountId: 1,
  destinationAccountId: 2,
  date: '2026-11-16',
  description: '',
  ...fields,
})

// 17:00 in Panama on 2026-11-16.
const NOW = new Date('2026-11-16T22:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const check = (fields: Partial<TransferDraft> = {}, accounts = [account(1), account(2)]) =>
  validateTransfer(draft(fields), { accounts })

describe('validateTransfer', () => {
  it('accepts a complete Transfer and trims the description', () => {
    expect(check({ amount: ' 250,5 ', description: '  Ahorro ' })).toEqual({
      ok: true,
      input: {
        amount: '250.50',
        sourceAccountId: 1,
        destinationAccountId: 2,
        date: '2026-11-16',
        description: 'Ahorro',
      },
    })
  })

  it('refuses an amount that is not above zero, with its own message past the limit', () => {
    for (const amount of ['', '0', '0.00', '-5', '12.505', 'abc']) {
      expect(check({ amount }), amount).toMatchObject({ ok: false, errors: { amount: [expect.any(String)] } })
    }
    expect(check({ amount: '9999999999999' })).toMatchObject({
      ok: false,
      errors: { amount: [expect.stringContaining('demasiado grande')] },
    })
  })

  it('refuses an Account to itself on the destination', () => {
    expect(check({ destinationAccountId: 1 })).toEqual({
      ok: false,
      errors: { destinationAccountId: ['El origen y el destino deben ser Cuentas distintas.'] },
    })
  })

  it('asks for both Accounts', () => {
    expect(check({ sourceAccountId: null, destinationAccountId: 99 })).toMatchObject({
      ok: false,
      errors: { sourceAccountId: [expect.any(String)], destinationAccountId: [expect.any(String)] },
    })
  })

  it('refuses a future date, using the Panama day at the moment of the check', () => {
    expect(check({ date: '2026-11-17' })).toMatchObject({ ok: false, errors: { date: [expect.stringContaining('futura')] } })
    // 23:59 in Panama is still the 16th, though UTC is already the 17th.
    vi.setSystemTime(new Date('2026-11-17T04:59:00Z'))
    expect(check({ date: '2026-11-17' })).toMatchObject({ ok: false })
    vi.setSystemTime(new Date('2026-11-17T05:00:00Z'))
    expect(check({ date: '2026-11-17' }).ok).toBe(true)
  })

  it('refuses a date before the start of either Account and names it', () => {
    const accounts = [account(1), account(2, { openingDate: '2026-11-10', name: 'Tardía' })]

    expect(check({ date: '2026-11-09' }, accounts)).toMatchObject({
      ok: false,
      errors: { date: [expect.stringContaining('Tardía')] },
    })
    expect(check({ date: '2026-11-10' }, accounts).ok).toBe(true)
  })

  it('refuses a description past 140 characters', () => {
    expect(check({ description: 'x'.repeat(141) })).toMatchObject({ ok: false, errors: { description: [expect.any(String)] } })
    expect(check({ description: 'x'.repeat(140) }).ok).toBe(true)
  })
})

describe('typedAmount', () => {
  it('is the amount once it is valid and null before', () => {
    expect(typedAmount('12,5')).toBe('12.50')
    expect(typedAmount('')).toBeNull()
  })
})

describe('chooseDefaultAccounts', () => {
  it('starts on the first two offered Accounts', () => {
    expect(chooseDefaultAccounts([account(5), account(6), account(7)])).toEqual({
      sourceAccountId: 5,
      destinationAccountId: 6,
    })
    expect(chooseDefaultAccounts([])).toEqual({ sourceAccountId: null, destinationAccountId: null })
  })
})
