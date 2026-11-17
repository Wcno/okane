import { toCents } from '../lib/decimal'
import { formatMoney } from '../lib/money'
import type { Dashboard } from './api'

/** "Quedan 15 días del mes", or the last day of it. */
export const daysLeftText = (days: number) =>
  days === 1 ? 'Hoy es el último día del mes' : `Quedan ${days} días del mes, hoy incluido`

/** The sentence under the Disponible: what it allows per day, or why there is nothing to spend. */
export function perDaySentence({ available, perDay, daysLeft }: Pick<Dashboard, 'available' | 'perDay' | 'daysLeft'>) {
  if (toCents(available) < 0n) {
    return `Lo Comprometido supera el Saldo de tus Cuentas de gastos por ${formatMoney(available.slice(1))}. ${daysLeftText(daysLeft)}.`
  }
  return daysLeft === 1
    ? `Son ${formatMoney(perDay)} para hoy, el último día del mes.`
    : `Son ${formatMoney(perDay)} por día durante los ${daysLeft} días que quedan del mes, hoy incluido.`
}

/** The share of `part` in `whole`, 0 to 100, for the width of a bar; display only. */
export function percentOf(part: string, whole: string) {
  const total = Number(toCents(whole))
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (Number(toCents(part)) / total) * 100))
}
