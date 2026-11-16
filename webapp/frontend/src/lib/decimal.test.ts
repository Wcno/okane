import { describe, expect, it } from 'vitest'
import { sumAmounts, toCents, toDisplayNumber } from './decimal'

describe('toCents', () => {
  it('reads positive, negative and whole amounts', () => {
    expect(toCents('1284.60')).toBe(128460)
    expect(toCents('-312.45')).toBe(-31245)
    expect(toCents('7')).toBe(700)
    expect(toCents('0.5')).toBe(50)
    expect(Object.is(toCents('-0.00'), 0)).toBe(true)
  })

  it('refuses text that is not an amount in cents', () => {
    expect(() => toCents('1.005')).toThrow()
    expect(() => toCents('abc')).toThrow()
  })
})

describe('sumAmounts', () => {
  it('adds without binary rounding errors', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe(0.3)
    expect(sumAmounts(['900.00', '-150.00', '4150.10'])).toBe(4900.1)
    expect(sumAmounts([])).toBe(0)
  })
})

describe('toDisplayNumber', () => {
  it('keeps the sign', () => {
    expect(toDisplayNumber('-312.45')).toBe(-312.45)
  })
})
