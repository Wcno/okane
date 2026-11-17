import { describe, expect, it } from 'vitest'
import type { Account } from '../accounts/api'
import { chooseDefaultAccount, parseAmount, validateExpense, type ExpenseDraft } from './form'

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

const check = (fields: Partial<ExpenseDraft> = {}, accounts = [account()]) =>
  validateExpense(draft(fields), { accounts, today: '2026-11-16' })

describe('parseAmount', () => {
  it('reads an exact amount in cents as the decimal string the API takes', () => {
    expect(parseAmount('12.5')).toBe('12.50')
    expect(parseAmount(' 12,50 ')).toBe('12.50')
    expect(parseAmount('007')).toBe('7.00')
    expect(parseAmount('0.01')).toBe('0.01')
    expect(parseAmount('999999999999.99')).toBe('999999999999.99')
  })

  it('refuses what is not a positive amount with at most two decimals', () => {
    for (const text of ['', ' ', '0', '0.00', '-5', '12.505', 'abc', '1e3', '1,250.00', '1.', '.5', '9999999999999']) {
      expect(parseAmount(text), text).toBeNull()
    }
  })
})

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

  it('refuses a date in the future, an unreadable one and one before the Account started', () => {
    expect(check({ date: '2026-11-17' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
    expect(check({ date: '' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
    const early = check({ date: '2026-10-31' })
    expect(early).toMatchObject({ ok: false, errors: { date: [expect.stringContaining('2026-11-01')] } })
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
