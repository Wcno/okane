import { useExpenseRevision } from '../expenses/revision'
import { useLoaded } from '../lib/useLoaded'
import { getBudgetMonth } from './api'

/** The Budgets of a month and its spending; loads again when an Expense changes elsewhere. */
export function useBudgetMonth(month: string) {
  const revision = useExpenseRevision()
  return useLoaded(() => getBudgetMonth(month), `${month}:${revision}`)
}
