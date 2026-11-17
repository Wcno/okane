import { formatDay } from '../lib/dates'
import type { Income } from './api'

export const incomesBack = { to: '/incomes', label: 'Ingresos' }

/** Why the screens that register an Income ask for an Account first. */
export const NEEDS_AN_ACCOUNT_FOR_INCOME =
  'Un ingreso entra a una Cuenta de gastos o de ahorro. Crea la que usas para recibir tu dinero y vuelve aquí.'

/** What an Income is called and what is known about it: its description, else "Ingreso". */
export function describeIncome(
  income: Income,
  accountName: string | undefined,
  options: { withDate?: boolean } = {},
): { title: string; details: string } {
  const details = [accountName, options.withDate && formatDay(income.date)]
  return { title: income.description || 'Ingreso', details: details.filter(Boolean).join(' · ') }
}
