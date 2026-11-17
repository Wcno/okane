import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../accounts/api'
import { validateConfirmation, validateRecurringPayment, type RecurringPaymentDraft } from './form'

const account = (patch: Partial<Account> = {}): Account => ({
  id: 3,
  name: 'Cuenta corriente',
  type: 'spending',
  openingBalance: '0.00',
  openingDate: '2026-01-01',
  annualInterestRate: null,
  balance: '0.00',
  hasRecords: false,
  archivedAt: null,
  ...patch,
})

const accounts = [account()]

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-12-02T15:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('validateRecurringPayment', () => {
  const draft: RecurringPaymentDraft = {
    description: ' Alquiler ',
    amount: '100',
    categoryId: 1,
    accountId: 3,
    dayOfMonth: '31',
    startDate: '2026-11-01',
  }

  it('accepts a rule and turns it into what the API takes', () => {
    expect(validateRecurringPayment(draft, { accounts })).toEqual({
      ok: true,
      rule: { description: 'Alquiler', amount: '100.00', accountId: 3, categoryId: 1, dayOfMonth: 31, startDate: '2026-11-01' },
    })
  })

  it('allows a start date in the future', () => {
    expect(validateRecurringPayment({ ...draft, startDate: '2027-01-01' }, { accounts }).ok).toBe(true)
  })

  it('names every field that is wrong', () => {
    const outcome = validateRecurringPayment(
      { description: 'x'.repeat(141), amount: '0', categoryId: null, accountId: null, dayOfMonth: '32', startDate: '' },
      { accounts },
    )

    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(Object.keys(outcome.errors).sort()).toEqual(
      ['accountId', 'amount', 'categoryId', 'dayOfMonth', 'description', 'startDate'].sort(),
    )
  })

  it('rejects day 0, a decimal day and text', () => {
    for (const dayOfMonth of ['0', '1.5', 'ab', '']) {
      const outcome = validateRecurringPayment({ ...draft, dayOfMonth }, { accounts })
      expect(outcome).toMatchObject({ ok: false, errors: { dayOfMonth: [expect.any(String)] } })
    }
  })

  it('explains an amount that is too large', () => {
    const outcome = validateRecurringPayment({ ...draft, amount: '1000000000000' }, { accounts })
    expect(outcome).toMatchObject({ ok: false, errors: { amount: [expect.stringContaining('demasiado grande')] } })
  })
})

describe('validateConfirmation', () => {
  const draft = { amount: '120', accountId: 3, date: '2026-12-02' }
  const context = { accounts, enteredOn: '2026-11-01' as string | null }

  it('accepts the reviewed payment, today by default', () => {
    expect(validateConfirmation(draft, context)).toEqual({
      ok: true,
      confirmation: { amount: '120.00', accountId: 3, date: '2026-12-02' },
    })
  })

  it('takes "today" in Panama at the moment of the check', () => {
    vi.setSystemTime(new Date('2026-12-03T02:00:00Z'))

    expect(validateConfirmation(draft, context).ok).toBe(true)
    expect(validateConfirmation({ ...draft, date: '2026-12-03' }, context)).toMatchObject({
      ok: false,
      errors: { date: [expect.stringContaining('futura')] },
    })
  })

  it('rejects a day before the reservation began, with that day in Spanish', () => {
    expect(validateConfirmation({ ...draft, date: '2026-10-31' }, context)).toMatchObject({
      ok: false,
      errors: { date: [expect.stringContaining('1 nov 2026')] },
    })
  })

  it('rejects a day before the Account began', () => {
    expect(
      validateConfirmation({ ...draft, date: '2025-12-31' }, { accounts, enteredOn: null }),
    ).toMatchObject({ ok: false, errors: { date: [expect.stringContaining('Cuenta')] } })
  })

  it('rejects a zero amount and a missing Account', () => {
    expect(validateConfirmation({ ...draft, amount: '0', accountId: null }, context)).toMatchObject({
      ok: false,
      errors: { amount: [expect.any(String)], accountId: [expect.any(String)] },
    })
  })
})
