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
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** 2026-11-01 as "1 nov 2026". */
export function formatDay(day: string): string {
  const parts = spanishDay.formatToParts(new Date(`${day}T00:00:00Z`))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('day')} ${part('month').replace('.', '')} ${part('year')}`
}
