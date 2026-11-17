import { describe, expect, it } from 'vitest'
import { isMonth, monthName, monthOf, shiftMonth, shortMonthName } from './months'

describe('months', () => {
  it('recognises a month written as 2026-11', () => {
    expect(isMonth('2026-11')).toBe(true)
    expect(isMonth('2026-13')).toBe(false)
    expect(isMonth('2026-11-01')).toBe(false)
    expect(isMonth('')).toBe(false)
  })

  it('takes the month of a calendar day', () => {
    expect(monthOf('2026-11-16')).toBe('2026-11')
  })

  it('moves across year boundaries in both directions', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', -11)).toBe('2025-12')
  })

  it('names a month in Spanish with a capital', () => {
    expect(monthName('2026-11')).toBe('Noviembre 2026')
    expect(monthName('2026-09')).toBe('Septiembre 2026')
  })

  it('abbreviates a month with its two-digit year for a chart axis', () => {
    expect(shortMonthName('2026-11')).toBe('nov 26')
    expect(shortMonthName('2025-01')).toBe('ene 25')
  })
})
