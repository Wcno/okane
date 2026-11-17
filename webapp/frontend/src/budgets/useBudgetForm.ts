import type { Outcome } from '../lib/http'
import { useRecordForm } from '../lib/useRecordForm'
import type { Budget, BudgetField, BudgetInput } from './api'
import { validateBudget, type BudgetDraft } from './form'

/** The form that creates or corrects a Budget; it is checked in the browser before it is sent. */
export function useBudgetForm({
  initial,
  save,
  onSaved,
}: {
  initial: BudgetDraft
  save: (budget: BudgetInput) => Promise<Outcome<Budget, BudgetField>>
  onSaved: (budget: Budget) => void | Promise<void>
}) {
  return useRecordForm<BudgetDraft, BudgetField, BudgetInput, Budget>({
    initial,
    validate: validateBudget,
    dateDependsOn: [],
    save,
    onSaved,
  })
}
