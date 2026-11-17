import { describe, expect, it } from 'vitest'
import { dayHeading, groupByDay } from './days'

const record = (id: number, date: string) => ({ id, date })

describe('dayHeading', () => {
  it('names today and yesterday and writes any other day out', () => {
    expect(dayHeading('2026-11-16', '2026-11-16')).toBe('Hoy')
    expect(dayHeading('2026-11-15', '2026-11-16')).toBe('Ayer')
    expect(dayHeading('2026-11-09', '2026-11-16')).toBe('lun 9 nov')
  })

  it('adds the year to a day of another year', () => {
    expect(dayHeading('2025-12-31', '2026-11-16')).toBe('mié 31 dic 2025')
  })

  it('names yesterday across a month boundary', () => {
    expect(dayHeading('2026-10-31', '2026-11-01')).toBe('Ayer')
  })
})

describe('groupByDay', () => {
  it('keeps the order and starts a group whenever the day changes', () => {
    const groups = groupByDay([record(4, '2026-11-16'), record(3, '2026-11-16'), record(2, '2026-11-10')])

    expect(groups.map((group) => [group.date, group.items.map((item) => item.id)])).toEqual([
      ['2026-11-16', [4, 3]],
      ['2026-11-10', [2]],
    ])
  })

  it('is empty for no records', () => {
    expect(groupByDay([])).toEqual([])
  })
})
