import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '../accounts/api'
import { chooseDefaultAccount, validateExpense, type ExpenseDraft } from './form'

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

const draft = (fields: Partial<ExpenseDraft> = {}): ExpenseDraft => ({
  amount: '12.50',
  categoryId: 2,
  accountId: 1,
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

const check = (fields: Partial<ExpenseDraft> = {}, accounts = [account()]) =>
  validateExpense(draft(fields), { accounts })

describe('validateExpense', () => {
  it('turns a complete draft into the Expense to send', () => {
    expect(check({ description: '  Supermercado ' })).toEqual({
      ok: true,
      expense: { amount: '12.50', categoryId: 2, accountId: 1, date: '2026-11-16', description: 'Supermercado' },
    })
  })

  it('asks for an amount, a Category and an Account', () => {
    const outcome = check({ amount: '', categoryId: null, accountId: null })

    expect(outcome).toMatchObject({ ok: false })
    if (outcome.ok) return
    expect(Object.keys(outcome.errors).sort()).toEqual(['accountId', 'amount', 'categoryId'])
    expect(outcome.errors.amount?.[0]).toContain('Ejemplo: 12.50')
  })

  it('does not call a too large amount "not greater than zero"', () => {
    const outcome = check({ amount: '1000000000000' })

    expect(outcome.ok ? [] : outcome.errors.amount).toEqual([expect.stringContaining('demasiado grande')])
  })

  it('refuses a date in the future, an unreadable one and one before the Account started', () => {
    expect(check({ date: '2026-11-17' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
    expect(check({ date: '' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
  })

  it('names the day the Account started in the way the app writes dates', () => {
    const early = check({ date: '2026-10-31' })

    expect(early).toMatchObject({ ok: false, errors: { date: [expect.stringContaining('(1 nov 2026)')] } })
  })

  it('reads the Panama day when it validates, so a form left open past midnight follows the new day', () => {
    // 04:00Z is 23:00 on the 16th in Panama: the 17th has not started.
    vi.setSystemTime(new Date('2026-11-17T04:00:00Z'))
    expect(check({ date: '2026-11-17' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })

    vi.setSystemTime(new Date('2026-11-17T05:00:00Z'))
    expect(check({ date: '2026-11-17' }).ok).toBe(true)
  })

  it('accepts today and the day the Account started', () => {
    expect(check({ date: '2026-11-16' }).ok).toBe(true)
    expect(check({ date: '2026-11-01' }).ok).toBe(true)
  })

  it('refuses a description longer than 140 characters', () => {
    expect(check({ description: 'x'.repeat(141) })).toMatchObject({ ok: false, errors: { description: [expect.any(String)] } })
    expect(check({ description: 'x'.repeat(140) }).ok).toBe(true)
  })
})

describe('chooseDefaultAccount', () => {
  const checking = account({ id: 1 })
  const savings = account({ id: 2, type: 'savings' })

  it('proposes the last Account used when it can still take an Expense', () => {
    expect(chooseDefaultAccount([checking, savings], 2)).toBe(2)
  })

  it('falls back to the first Account when the last used one is gone or not offered', () => {
    expect(chooseDefaultAccount([checking, savings], 99)).toBe(1)
    expect(chooseDefaultAccount([checking, savings], null)).toBe(1)
  })

  it('proposes nothing when no Account can take an Expense', () => {
    expect(chooseDefaultAccount([], 1)).toBeNull()
  })
})
