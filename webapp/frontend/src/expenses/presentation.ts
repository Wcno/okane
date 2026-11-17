import type { Account } from '../accounts/api'
import { categoryById } from '../data/categories'
import { formatDay } from '../lib/dates'
import type { Expense } from './api'

/** Accounts that can take an Expense: spending or savings, not archived. `keep` stays even if archived. */
export function offeredAccounts(accounts: Account[], keep?: number): Account[] {
  return accounts.filter(
    (account) => account.id === keep || (account.type !== 'investment' && account.archivedAt === null),
  )
}

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
export const NEEDS_AN_ACCOUNT =
  'Un gasto sale de una Cuenta de gastos o de ahorro. Crea la que usas para pagar y vuelve aquí.'
