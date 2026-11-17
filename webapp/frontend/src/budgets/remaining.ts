import { sumAmounts } from '../lib/decimal'
import { formatMoney } from '../lib/money'
import type { BudgetMonth } from './api'

const lineOf = (month: BudgetMonth, categoryId: number) => month.lines.find((line) => line.categoryId === categoryId)

export type Remaining =
  | { kind: 'no-budget' }
  | { kind: 'remaining'; before: string; after: string }
  | { kind: 'exceeded'; before: string; excess: string }

const classify = (before: string, after: string): Remaining =>
  after.startsWith('-') ? { kind: 'exceeded', before, excess: after.slice(1) } : { kind: 'remaining', before, after }

/** What is left of the Budget of `categoryId` in the month, as api-service computed it. */
export function remainingNow(month: BudgetMonth, categoryId: number): Remaining {
  const remaining = lineOf(month, categoryId)?.remaining ?? null
  return remaining === null ? { kind: 'no-budget' } : classify(remaining, remaining)
}

/** What would be left once `amount` (a decimal string) is spent in `categoryId`. */
export function remainingAfter(month: BudgetMonth, categoryId: number, amount: string): Remaining {
  const remaining = lineOf(month, categoryId)?.remaining ?? null
  return remaining === null ? { kind: 'no-budget' } : classify(remaining, sumAmounts([remaining, `-${amount}`]))
}

/** The line under the Category while the form is open. */
export function previewText(category: string, remaining: Remaining): string {
  switch (remaining.kind) {
    case 'no-budget':
      return `${category} no tiene Presupuesto este mes; el gasto se registra igual.`
    case 'exceeded':
      return `${category} quedará excedida por ${formatMoney(remaining.excess)}; el gasto se registra igual.`
    case 'remaining':
      return `Restante en ${category}: de ${formatMoney(remaining.before)} a ${formatMoney(remaining.after)}.`
  }
}

/** The line of the confirmation once the Expense is saved and the month was read again. */
export function confirmationText(category: string, remaining: Remaining): string {
  switch (remaining.kind) {
    case 'no-budget':
      return `${category} no tiene Presupuesto este mes.`
    case 'exceeded':
      return `${category} queda excedida por ${formatMoney(remaining.excess)}.`
    case 'remaining':
      return `Restante en ${category}: ${formatMoney(remaining.after)}.`
  }
}
