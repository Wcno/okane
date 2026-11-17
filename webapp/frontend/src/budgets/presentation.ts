import { categoryById } from '../data/categories'
import { sumAmounts } from '../lib/decimal'
import { formatMoney } from '../lib/money'
import type { Budget, BudgetLine } from './api'

export const budgetsBack = { to: '/budgets', label: 'Presupuestos' }

/** The Budgets screen of a month. */
export const budgetsOf = (month: string) => `/budgets?month=${month}`

/** The Categories without a Budget that spent in the month; the rest have nothing to show. */
export const unbudgetedWithSpending = (lines: BudgetLine[]) =>
  lines.filter((line) => line.id === null && line.spent !== '0.00')

/**
 * What a Budget row says besides the Restante: whether it is exceeded, the
 * spending, and what is held back, the carry-over of earlier months apart from
 * the payments reserved in this one.
 */
export function describeBudget(budget: Budget): { title: string; details: string } {
  const reserved = sumAmounts([budget.committed, `-${budget.carriedOver}`])
  const details = [
    budget.exceeded && `Excedida por ${formatMoney(budget.remaining.slice(1))}`,
    `Gastado ${formatMoney(budget.spent)} de ${formatMoney(budget.amount)}`,
    reserved !== '0.00' && `Comprometido ${formatMoney(reserved)}`,
    budget.carriedOver !== '0.00' && `Arrastre ${formatMoney(budget.carriedOver)}`,
  ]
  return { title: categoryById(budget.categoryId).name, details: details.filter(Boolean).join(' · ') }
}
