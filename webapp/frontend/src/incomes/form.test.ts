import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../accounts/api'
import { defaultAccountId, validateIncome, type IncomeDraft } from './form'

const account = (fields: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Cuenta corriente',
  type: 'spending',
  openingBalance: '1000.00',
  openingDate: '2026-11-01',
  annualInterestRate: null,
  balance: '1000.00',
  hasRecords: false,
  archivedAt: null,
  ...fields,
})

const draft = (fields: Partial<IncomeDraft> = {}): IncomeDraft => ({
  amount: '100.00',
  accountId: 1,
  date: '2026-11-16',
  description: '',
  ...fields,
})

beforeEach(() => {
  vi.useFakeTimers()
  // 17:00 in Panama on 2026-11-16.
  vi.setSystemTime(new Date('2026-11-16T22:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const check = (fields: Partial<IncomeDraft> = {}) => validateIncome(draft(fields), { accounts: [account()] })

describe('validateIncome', () => {
  it('turns a complete draft into the Income to send', () => {
    expect(check({ amount: '1,250.5'.replace(',', ''), description: '  Salario ' })).toEqual({
      ok: true,
      income: { amount: '1250.50', accountId: 1, date: '2026-11-16', description: 'Salario' },
    })
  })

  it('asks for an amount and an Account, and never for a Category', () => {
    const outcome = check({ amount: '', accountId: null })

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(Object.keys(outcome.errors).sort()).toEqual(['accountId', 'amount'])
    expect(outcome.errors.accountId).toEqual(['Elige la Cuenta a la que entró el dinero.'])
  })

  it('refuses a zero or negative amount and one past twelve digits with its own message', () => {
    for (const amount of ['0', '-5']) {
      expect(check({ amount }), amount).toMatchObject({ ok: false, errors: { amount: [expect.any(String)] } })
    }
    const large = check({ amount: '1000000000000' })
    expect(large.ok ? [] : large.errors.amount).toEqual([expect.stringContaining('demasiado grande')])
  })

  it('refuses a future date, an unreadable one and one before the Account started', () => {
    expect(check({ date: '2026-11-17' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
    expect(check({ date: '' })).toMatchObject({ ok: false, errors: { date: ['Elige la fecha del ingreso.'] } })
    expect(check({ date: '2026-10-31' })).toMatchObject({
      ok: false,
      errors: { date: [expect.stringContaining('(1 nov 2026)')] },
    })
  })

  it('refuses a description over 140 characters', () => {
    expect(check({ description: 'x'.repeat(141) })).toMatchObject({ ok: false, errors: { description: [expect.any(String)] } })
    expect(check({ description: 'x'.repeat(140) }).ok).toBe(true)
  })
})

describe('defaultAccountId', () => {
  it('starts on the first Account offered, or on none', () => {
    expect(defaultAccountId([account({ id: 4 }), account({ id: 5 })])).toBe(4)
    expect(defaultAccountId([])).toBeNull()
  })
})
