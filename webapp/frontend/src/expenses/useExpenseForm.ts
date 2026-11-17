import type { Account } from '../accounts/api'
import type { Outcome } from '../lib/http'
import { useRecordForm } from '../lib/useRecordForm'
import type { Expense, ExpenseField, ExpenseInput } from './api'
import { validateExpense, type ExpenseDraft } from './form'

/** The date is checked against the Account's start, so changing the Account re-judges it. */
const affectedBy = (patch: Partial<ExpenseDraft>): ExpenseField[] => ('accountId' in patch ? ['date'] : [])

/** The form that registers or corrects an Expense. */
export function useExpenseForm({
  initial,
  accounts,
  save,
  onSaved,
}: {
  initial: ExpenseDraft
  accounts: Account[]
  save: (expense: ExpenseInput) => Promise<Outcome<Expense, ExpenseField>>
  onSaved: (expense: Expense) => void | Promise<void>
}) {
  return useRecordForm<ExpenseDraft, ExpenseField, ExpenseInput, Expense>({
    initial,
    validate: (draft) => {
      const checked = validateExpense(draft, { accounts })
      return checked.ok ? { ok: true, input: checked.expense } : checked
    },
    affectedBy,
    save,
    onSaved,
  })
}
