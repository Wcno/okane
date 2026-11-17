import type { Account } from '../accounts/api'
import { formatMoney } from '../lib/money'
import type { Expense } from './api'

/** Accounts that can take an Expense: spending or savings, not archived. `keep` stays even if archived. */
export function offeredAccounts(accounts: Account[], keep?: number): Account[] {
  return accounts.filter(
    (account) => account.id === keep || (account.type !== 'investment' && account.archivedAt === null),
  )
}

const heading = new Intl.DateTimeFormat('es', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

/** "Hoy", "Ayer" or "lun 9 nov"; a day of another year carries the year. */
export function dayHeading(day: string, today: string): string {
  if (day === today) return 'Hoy'
  if (day === dayBefore(today)) return 'Ayer'
  const parts = heading.formatToParts(new Date(`${day}T00:00:00Z`))
  const part = (type: Intl.DateTimeFormatPartTypes) => (parts.find((item) => item.type === type)?.value ?? '').replace('.', '')
  const text = `${part('weekday')} ${part('day')} ${part('month')}`
  return day.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${part('year')}`
}

export interface DayGroup {
  date: string
  expenses: Expense[]
}

/** Splits a list that is already sorted by date into one group per day. */
export function groupByDay(expenses: Expense[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const expense of expenses) {
    const last = groups[groups.length - 1]
    if (last?.date === expense.date) last.expenses.push(expense)
    else groups.push({ date: expense.date, expenses: [expense] })
  }
  return groups
}

/** The notice shown on the Expenses screen after a change. */
export interface ExpensesNotice {
  notice: string
}

export const isExpensesNotice = (state: unknown): state is ExpensesNotice =>
  typeof state === 'object' && state !== null && typeof (state as ExpensesNotice).notice === 'string'

export const formatAmount = (amount: string) => formatMoney(amount)
