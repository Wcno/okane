import { describe, expect, it } from 'vitest'
import {
  parseOpeningBalance,
  percentToRatio,
  ratioToPercent,
  validateAccountChanges,
  validateNewAccount,
  type AccountDraft,
} from './form'

const draft: AccountDraft = {
  name: 'Cuenta corriente',
  type: 'spending',
  openingBalance: '1250.5',
  isDebt: false,
  openingDate: '2026-11-01',
  annualRatePercent: '',
}

describe('parseOpeningBalance', () => {
  it('normalizes what the User typed to two decimals', () => {
    expect(parseOpeningBalance('1250.5', false)).toEqual({ amount: '1250.50' })
    expect(parseOpeningBalance(' 1250,5 ', false)).toEqual({ amount: '1250.50' })
    expect(parseOpeningBalance('0', false)).toEqual({ amount: '0.00' })
    expect(parseOpeningBalance('-312.45', false)).toEqual({ amount: '-312.45' })
    expect(parseOpeningBalance('−312.45', false)).toEqual({ amount: '-312.45' })
  })

  it('makes a debt negative whichever way it was typed', () => {
    expect(parseOpeningBalance('312.45', true)).toEqual({ amount: '-312.45' })
    expect(parseOpeningBalance('-312.45', true)).toEqual({ amount: '-312.45' })
    expect(parseOpeningBalance('0', true)).toEqual({ amount: '0.00' })
  })

  it('refuses text that is not an amount in cents', () => {
    for (const text of ['', 'abc', '12.345', '1,250.50', '--5', '1e3']) {
      expect(parseOpeningBalance(text, false)).toEqual({ error: 'invalid' })
    }
  })
})

describe('an opening balance past twelve digits', () => {
  it('is too large, which is not the same as invalid', () => {
    expect(parseOpeningBalance('1000000000000', false)).toEqual({ error: 'too-large' })
    expect(parseOpeningBalance('1000000000000', true)).toEqual({ error: 'too-large' })
  })
})

describe('annual rate', () => {
  it('turns a percentage into the exact ratio the API stores', () => {
    expect(percentToRatio('4.25')).toBe('0.0425')
    expect(percentToRatio('4,25')).toBe('0.0425')
    expect(percentToRatio('12')).toBe('0.12')
    expect(percentToRatio('100')).toBe('1.00')
    expect(percentToRatio('0')).toBe('0.00')
    expect(percentToRatio('0.0001')).toBe('0.000001')
  })

  it('refuses a negative or overly precise percentage', () => {
    for (const text of ['-1', 'abc', '', '4.25001', '1e2']) {
      expect(percentToRatio(text)).toBeNull()
    }
  })

  it('shows a stored ratio as a percentage without padding', () => {
    expect(ratioToPercent('0.042500')).toBe('4.25')
    expect(ratioToPercent('0.120000')).toBe('12')
    expect(ratioToPercent('1.000000')).toBe('100')
    expect(ratioToPercent('0.000000')).toBe('0')
    expect(ratioToPercent('0.000001')).toBe('0.0001')
  })
})

describe('validateNewAccount', () => {
  it('builds the request for a spending Account', () => {
    expect(validateNewAccount(draft, '2026-11-16')).toEqual({
      ok: true,
      account: {
        name: 'Cuenta corriente',
        type: 'spending',
        openingBalance: '1250.50',
        openingDate: '2026-11-01',
        annualInterestRate: null,
      },
    })
  })

  it('builds a credit card as a spending Account that starts in debt', () => {
    const outcome = validateNewAccount({ ...draft, openingBalance: '312.45', isDebt: true }, '2026-11-16')

    expect(outcome.ok && outcome.account.openingBalance).toBe('-312.45')
  })

  it('sends the annual rate only for a savings Account', () => {
    const savings = validateNewAccount({ ...draft, type: 'savings', annualRatePercent: '4.25' }, '2026-11-16')
    const spending = validateNewAccount({ ...draft, annualRatePercent: '4.25' }, '2026-11-16')

    expect(savings.ok && savings.account.annualInterestRate).toBe('0.0425')
    expect(spending.ok && spending.account.annualInterestRate).toBeNull()
  })

  it('ignores the debt switch outside a spending Account', () => {
    const outcome = validateNewAccount({ ...draft, type: 'savings', isDebt: true }, '2026-11-16')

    expect(outcome.ok && outcome.account.openingBalance).toBe('1250.50')
  })

  it('says what is missing in each field', () => {
    const outcome = validateNewAccount(
      { name: '  ', type: null, openingBalance: 'mil', isDebt: false, openingDate: '', annualRatePercent: '' },
      '2026-11-16',
    )

    expect(outcome.ok ? [] : Object.keys(outcome.errors)).toEqual(['name', 'type', 'openingBalance', 'openingDate'])
  })

  it('says an opening balance past twelve digits is too large', () => {
    const outcome = validateNewAccount({ ...draft, openingBalance: '1000000000000' }, '2026-11-16')

    expect(outcome.ok ? [] : outcome.errors.openingBalance).toEqual([expect.stringContaining('demasiado grande')])
  })

  it('refuses a start date after today and a wrong rate', () => {
    const outcome = validateNewAccount(
      { ...draft, type: 'savings', openingDate: '2026-11-17', annualRatePercent: '-2' },
      '2026-11-16',
    )

    expect(outcome.ok ? [] : Object.keys(outcome.errors)).toEqual(['openingDate', 'annualInterestRate'])
  })
})

describe('validateAccountChanges', () => {
  it('keeps the rate out of an Account that is not for savings', () => {
    expect(validateAccountChanges({ name: ' Bróker ', annualRatePercent: '5' }, 'investment')).toEqual({
      ok: true,
      changes: { name: 'Bróker' },
    })
  })

  it('sends the corrected or cleared rate of a savings Account', () => {
    expect(validateAccountChanges({ name: 'Ahorro', annualRatePercent: '3.75' }, 'savings')).toEqual({
      ok: true,
      changes: { name: 'Ahorro', annualInterestRate: '0.0375' },
    })
    expect(validateAccountChanges({ name: 'Ahorro', annualRatePercent: ' ' }, 'savings')).toEqual({
      ok: true,
      changes: { name: 'Ahorro', annualInterestRate: null },
    })
  })

  it('requires a name', () => {
    const outcome = validateAccountChanges({ name: '', annualRatePercent: '' }, 'savings')

    expect(outcome.ok ? [] : Object.keys(outcome.errors)).toEqual(['name'])
  })
})
