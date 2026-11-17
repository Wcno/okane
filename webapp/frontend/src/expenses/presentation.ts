import { categoryById } from '../data/categories'
import { formatDay } from '../lib/dates'
import type { Expense } from './api'

export const expensesBack = { to: '/expenses', label: 'Gastos' }

/** What an Expense is called and what is known about it: the description, else its Category. */
export function describeExpense(
  expense: Expense,
  accountName: string | undefined,
  options: { withDate?: boolean } = {},
): { title: string; details: string } {
  const category = categoryById(expense.categoryId).name
  const details = [
    expense.description && category,
    accountName,
    options.withDate && formatDay(expense.date),
  ]
  return { title: expense.description || category, details: details.filter(Boolean).join(' · ') }
}

/** Why the screens that register an Expense ask for an Account first. */
export const NEEDS_AN_ACCOUNT_FOR_EXPENSE =
  'Un gasto sale de una Cuenta de gastos o de ahorro. Crea la que usas para pagar y vuelve aquí.'
