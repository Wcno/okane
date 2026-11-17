import { readJson } from '../lib/http'
import type { AccountType } from '../accounts/api'
import { toLine, type Budget, type BudgetBody } from '../budgets/api'
import { toOccurrence, type OccurrenceBody, type RecurringPaymentOccurrence } from '../recurringPayments/api'

/** An Account as the Panel lists it: its Saldo, as api-service derived it. */
export interface PanelAccount {
  id: number
  name: string
  type: AccountType
  balance: string
  archived: boolean
}

/** Everything the Panel shows, as api-service computed it. Amounts stay decimal strings. */
export interface Dashboard {
  /** The calendar month, as 2026-11. */
  month: string
  /** The days from today to month end, today included. */
  daysLeft: number
  available: string
  spendingBalance: string
  /** What spending Accounts have committed; savings payments are not in it. */
  committed: string
  committedCount: number
  /** Disponible over the days left; negative when Disponible is. */
  perDay: string
  netWorth: string
  income: string
  expenses: string
  /** Incomes minus Expenses of the month. */
  netSavings: string
  budgets: Budget[]
  overdue: RecurringPaymentOccurrence[]
  upcoming: RecurringPaymentOccurrence[]
  accounts: PanelAccount[]
}

interface DashboardBody {
  month: string
  days_left: number
  available: string
  spending_balance: string
  committed: string
  committed_count: number
  per_day: string
  net_worth: string
  income: string
  expenses: string
  net_savings: string
  budgets: BudgetBody[]
  overdue: OccurrenceBody[]
  upcoming: OccurrenceBody[]
  accounts: PanelAccount[]
}

const LOAD_FAILED = 'Okane no pudo consultar tu Panel. Espera un momento e inténtalo de nuevo.'

export async function getDashboard(): Promise<Dashboard> {
  const body = await readJson<DashboardBody>('/api/dashboard', { failed: LOAD_FAILED })
  return {
    month: body.month,
    daysLeft: body.days_left,
    available: body.available,
    spendingBalance: body.spending_balance,
    committed: body.committed,
    committedCount: body.committed_count,
    perDay: body.per_day,
    netWorth: body.net_worth,
    income: body.income,
    expenses: body.expenses,
    netSavings: body.net_savings,
    budgets: body.budgets.map((budget) => toLine(budget) as Budget),
    overdue: body.overdue.map(toOccurrence),
    upcoming: body.upcoming.map(toOccurrence),
    accounts: body.accounts,
  }
}
