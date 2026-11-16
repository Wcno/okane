import { formatMoney, moneyParts } from './money'
import { describe, expect, it } from 'vitest'
import { sumAmounts, toCents, toDisplayNumber } from './decimal'

describe('toCents', () => {
  it('reads positive, negative and whole amounts', () => {
    expect(toCents('1284.60')).toBe(128460n)
    expect(toCents('-312.45')).toBe(-31245n)
    expect(toCents('7')).toBe(700n)
    expect(toCents('0.5')).toBe(50n)
    expect(Object.is(toCents('-0.00'), 0n)).toBe(true)
  })

  it('refuses text that is not an amount in cents', () => {
    expect(() => toCents('1.005')).toThrow()
    expect(() => toCents('abc')).toThrow()
  })
})

describe('sumAmounts', () => {
  it('adds without binary rounding errors', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe('0.30')
    expect(sumAmounts(['900.00', '-150.00', '4150.10'])).toBe('4900.10')
    expect(sumAmounts([])).toBe('0.00')
  })
})

describe('toDisplayNumber', () => {
  it('keeps the sign', () => {
    expect(toDisplayNumber('-312.45')).toBe(-312.45)
  })
})

it('preserves cents above the safe integer range through presentation', () => {
  const total = sumAmounts([...Array(100).fill('999999999999.99'), '0.01'])
  expect(total).toBe('99999999999999.01')
  expect(formatMoney(total)).toBe('$99,999,999,999,999.01')
  expect(moneyParts(total).cents).toBe('01')
})
