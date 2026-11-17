import type { Account } from '../accounts/api'
import type { Outcome } from '../lib/http'
import { useRecordForm } from '../lib/useRecordForm'
import type { RecordField } from '../lib/recordForm'
import type { Income, IncomeInput } from './api'
import { validateIncome, type IncomeDraft } from './form'

/** The form that registers or corrects an Income; the Income is checked in the browser before it is sent. */
export function useIncomeForm({
  initial,
  accounts,
  save,
  onSaved,
}: {
  initial: IncomeDraft
  accounts: Account[]
  save: (income: IncomeInput) => Promise<Outcome<Income, RecordField>>
  onSaved: (income: Income) => void | Promise<void>
}) {
  return useRecordForm<IncomeDraft, RecordField, IncomeInput, Income>({
    initial,
    validate: (draft) => {
      const checked = validateIncome(draft, { accounts })
      return checked.ok ? { ok: true, value: checked.income } : checked
    },
    save,
    onSaved,
  })
}
