import type { Account } from '../accounts/api'
import type { Outcome } from '../lib/http'
import { useRecordForm } from '../lib/useRecordForm'
import type { Expense, ExpenseField, ExpenseInput } from './api'
import { validateExpense, type ExpenseDraft } from './form'

/** The form that registers or corrects an Expense; the Expense is checked in the browser before it is sent. */
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
      return checked.ok ? { ok: true, value: checked.expense } : checked
    },
    dateDependsOn: ['accountId'],
    save,
    onSaved,
  })
}
