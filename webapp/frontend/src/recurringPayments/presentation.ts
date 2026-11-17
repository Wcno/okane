import { categoryById } from '../data/categories'
import { formatDay } from '../lib/dates'
import type { RecurringPayment, RecurringPaymentOccurrence } from './api'

export const recurringPaymentsBack = { to: '/recurring-payments', label: 'Pagos recurrentes' }

/** What a rule is called: its description, else its Category. */
export const ruleTitle = (rule: Pick<RecurringPayment, 'description' | 'categoryId'>) =>
  rule.description || categoryById(rule.categoryId).name

/** A rule as a row of the list: the title, and what is known about it. */
export function describeRule(rule: RecurringPayment, accountName: string | undefined) {
  const category = categoryById(rule.categoryId).name
  const details = [rule.description && category, accountName, `Día ${rule.dayOfMonth} de cada mes`]
  return { title: ruleTitle(rule), details: details.filter(Boolean).join(' · ') }
}

/** The occurrences still reserving money: pending and overdue, the oldest due first. */
export function unresolved(occurrences: RecurringPaymentOccurrence[]): RecurringPaymentOccurrence[] {
  return occurrences
    .filter((occurrence) => occurrence.status === 'pending' || occurrence.status === 'overdue')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id)
}

/** The occurrences already answered, the latest due first. */
export function resolved(occurrences: RecurringPaymentOccurrence[]): RecurringPaymentOccurrence[] {
  return occurrences
    .filter((occurrence) => occurrence.status === 'confirmed' || occurrence.status === 'cancelled')
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.id - a.id)
}

/** Every occurrence of every rule, each once. */
export function allOccurrences(rules: RecurringPayment[]): RecurringPaymentOccurrence[] {
  const seen = new Map<number, RecurringPaymentOccurrence>()
  for (const rule of rules) for (const occurrence of rule.occurrences) seen.set(occurrence.id, occurrence)
  return [...seen.values()]
}

/** "Vence 5 nov 2026", or "Venció 5 nov 2026" once past. */
export function dueText(occurrence: Pick<RecurringPaymentOccurrence, 'dueDate' | 'status'>): string {
  const day = formatDay(occurrence.dueDate)
  return occurrence.status === 'overdue' ? `Venció ${day}` : `Vence ${day}`
}

export const STATUS_LABELS: Record<RecurringPaymentOccurrence['status'], string> = {
  pending: 'Pendiente',
  overdue: 'Vencido',
  confirmed: 'Pagado',
  cancelled: 'Cancelado',
}

/** Why the screens that create a rule ask for an Account first. */
export const NEEDS_AN_ACCOUNT_FOR_RULES =
  'Un pago recurrente sale de una Cuenta de gastos o de ahorro. Crea la que usas para pagar y vuelve aquí.'
