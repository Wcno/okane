import { describe, expect, it, vi } from 'vitest'
import { formatDay, isCalendarDay, todayInPanama } from './dates'

describe('calendar days', () => {
  it('is the day it is in Panama, not in UTC', () => {
    expect(todayInPanama(new Date('2026-11-17T03:30:00Z'))).toBe('2026-11-16')
    expect(todayInPanama(new Date('2026-11-17T05:00:00Z'))).toBe('2026-11-17')
  })

  it('reads the system clock when no instant is given', () => {
    vi.useFakeTimers()
    try {
      // 04:00Z is 23:00 in Panama, still the day before.
      vi.setSystemTime(new Date('2026-11-17T04:00:00Z'))
      expect(todayInPanama()).toBe('2026-11-16')
      vi.setSystemTime(new Date('2026-11-17T05:00:00Z'))
      expect(todayInPanama()).toBe('2026-11-17')
    } finally {
      vi.useRealTimers()
    }
  })

  it('formats a day the way the app writes dates', () => {
    expect(formatDay('2026-11-01')).toBe('1 nov 2026')
    expect(formatDay('2026-11-16')).toBe('16 nov 2026')
  })

  it('tells a written day from anything else', () => {
    expect(isCalendarDay('2026-11-01')).toBe(true)
    for (const text of ['', '2026-1-1', '01/11/2026', 'hoy']) expect(isCalendarDay(text), text).toBe(false)
  })
})
