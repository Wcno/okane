const panamaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Panama',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Financial dates are calendar days in America/Panama (docs/contratos.md). */
export const todayInPanama = (now = new Date()) => panamaDay.format(now)

const spanishDay = new Intl.DateTimeFormat('es', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Whether a date field holds a day written as 2026-11-01. */
export const isCalendarDay = (text: string) => CALENDAR_DAY.test(text)

/** The fields of a calendar day in Spanish ("weekday", "day", "month", "year"), without Intl's dots. */
export function spanishDayFields(day: string) {
  const parts = spanishDay.formatToParts(new Date(`${day}T00:00:00Z`))
  return (type: Intl.DateTimeFormatPartTypes) =>
    (parts.find((item) => item.type === type)?.value ?? '').replace('.', '')
}

/** 2026-11-01 as "1 nov 2026". */
export function formatDay(day: string): string {
  const field = spanishDayFields(day)
  return `${field('day')} ${field('month')} ${field('year')}`
}

/** The calendar day before `day`. */
export function dayBefore(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)
}

/** The last calendar day of a month written as 2026-11. */
export function lastDayOfMonth(month: string): string {
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
  return new Date(next.getTime() - 86_400_000).toISOString().slice(0, 10)
}
