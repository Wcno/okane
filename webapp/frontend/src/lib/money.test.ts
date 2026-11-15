import { describe, expect, it } from 'vitest'
import { formatMoney, formatCompactMoney, moneyParts } from './money'

describe('formatMoney', () => {
  it('uses comma grouping and always shows two decimal places', () => {
    expect(formatMoney(1284.6)).toBe('$1,284.60')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('places the minus sign before the currency symbol', () => {
    expect(formatMoney(-312.45)).toBe('−$312.45')
  })

  it('prefixes positive amounts when requested, but not zero', () => {
    expect(formatMoney(541.65, { sign: true })).toBe('+$541.65')
    expect(formatMoney(-64.95, { sign: true })).toBe('−$64.95')
    expect(formatMoney(0, { sign: true })).toBe('$0.00')
  })
})

describe('moneyParts', () => {
  it('separates the integer part and cents for large number layouts', () => {
    expect(moneyParts(771.9)).toEqual({ sign: '', integer: '771', cents: '90' })
    expect(moneyParts(-11513.85)).toEqual({ sign: '−', integer: '11,513', cents: '85' })
  })
})

describe('formatCompactMoney', () => {
  it('abbreviates thousands for chart axes', () => {
    expect(formatCompactMoney(9000)).toBe('$9K')
    expect(formatCompactMoney(12000)).toBe('$12K')
  })
})
