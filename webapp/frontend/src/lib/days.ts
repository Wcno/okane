import { dayBefore, spanishDayFields } from './dates'

/** "Hoy", "Ayer" or "lun 9 nov"; a day of another year carries the year. */
export function dayHeading(day: string, today: string): string {
  if (day === today) return 'Hoy'
  if (day === dayBefore(today)) return 'Ayer'
  const field = spanishDayFields(day)
  const text = `${field('weekday')} ${field('day')} ${field('month')}`
  return day.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${field('year')}`
}

export interface DayGroup<Item> {
  date: string
  items: Item[]
}

/** Splits a list that is already sorted by date into one group per day. */
export function groupByDay<Item extends { date: string }>(items: Item[]): DayGroup<Item>[] {
  const groups: DayGroup<Item>[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}
