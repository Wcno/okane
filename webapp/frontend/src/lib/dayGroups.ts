import { dayBefore, spanishDayFields } from './dates'

/** "Hoy", "Ayer" or "lun 9 nov"; a day of another year carries the year. */
export function dayHeading(day: string, today: string): string {
  if (day === today) return 'Hoy'
  if (day === dayBefore(today)) return 'Ayer'
  const field = spanishDayFields(day)
  const text = `${field('weekday')} ${field('day')} ${field('month')}`
  return day.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${field('year')}`
}

export interface DayGroup<Entry extends { date: string }> {
  date: string
  records: Entry[]
}

/** Splits a list that is already sorted by date into one group per day. */
export function groupByDay<Entry extends { date: string }>(records: Entry[]): DayGroup<Entry>[] {
  const groups: DayGroup<Entry>[] = []
  for (const record of records) {
    const last = groups[groups.length - 1]
    if (last?.date === record.date) last.records.push(record)
    else groups.push({ date: record.date, records: [record] })
  }
  return groups
}
