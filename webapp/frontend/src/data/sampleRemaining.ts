// TEMPORARY until the Budgets ticket (#9): Budgets are not in api-service yet, so
// the quick form still tells the Restante of its Category from the sample
// Budgets. Only the amount and the Category of the Expense reach this module.
import { sumAmounts } from '../lib/decimal'
import { formatMoney } from '../lib/money'
import { remainingBudget, type BudgetLine } from './sample'

export type SampleRemaining =
  | { kind: 'no-budget' }
  | { kind: 'remaining'; before: string; after: string }
  | { kind: 'exceeded'; before: string; excess: string }

/** What is left of the sample Budget of `category` once `amount` (a decimal string) is spent. */
export function sampleRemainingAfter(budgets: BudgetLine[], category: string, amount: string): SampleRemaining {
  const line = budgets.find((budget) => budget.category === category)
  const current = line ? remainingBudget(line) : null
  if (current === null) return { kind: 'no-budget' }

  // The sample figures are numbers; from here on the arithmetic is exact, in cents.
  const before = current.toFixed(2)
  const after = sumAmounts([before, `-${amount}`])
  if (after.startsWith('-')) return { kind: 'exceeded', before, excess: after.slice(1) }
  return { kind: 'remaining', before, after }
}

/** The line under the Category while the form is open. */
export function previewText(category: string, remaining: SampleRemaining): string {
  switch (remaining.kind) {
    case 'no-budget':
      return `${category} no tiene Presupuesto este mes; el gasto se registra igual.`
    case 'exceeded':
      return `${category} quedará excedida por ${formatMoney(remaining.excess)}; el gasto se registra igual.`
    case 'remaining':
      return `Restante en ${category}: de ${formatMoney(remaining.before)} a ${formatMoney(remaining.after)}.`
  }
}

/** The line of the confirmation once the Expense is saved. */
export function confirmationText(category: string, remaining: SampleRemaining): string {
  switch (remaining.kind) {
    case 'no-budget':
      return `${category} no tiene Presupuesto este mes.`
    case 'exceeded':
      return `${category} queda excedida por ${formatMoney(remaining.excess)}.`
    case 'remaining':
      return `Restante en ${category}: ${formatMoney(remaining.after)}.`
  }
}
