const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

const longMonth = new Intl.DateTimeFormat('es', {
  timeZone: 'UTC',
  month: 'long',
})

/** Whether text is a calendar month written as 2026-11. */
export const isMonth = (text: string) => MONTH.test(text)

/** The month a calendar day (2026-11-16) belongs to, as 2026-11. */
export const monthOf = (day: string) => day.slice(0, 7)

/** The month `offset` months from `month`; negative goes back. */
export function shiftMonth(month: string, offset: number): string {
  const total = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + offset
  const year = Math.floor(total / 12)
  return `${String(year).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`
}

const SHORT_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 2026-11 as "nov 26", short enough for a chart axis. */
export const shortMonthName = (month: string) => `${SHORT_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(2, 4)}`

/** 2026-11 as "Noviembre 2026". */
export function monthName(month: string): string {
  const name = longMonth.format(new Date(`${month}-01T00:00:00Z`))
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`
}
