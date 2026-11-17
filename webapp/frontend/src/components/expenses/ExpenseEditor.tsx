import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import type { Expense, ExpenseField, ExpenseInput } from '../../expenses/api'
import type { ExpenseDraft } from '../../expenses/form'
import type { Outcome } from '../../lib/http'
import { useExpenseForm } from '../../expenses/useExpenseForm'
import { RecordForm } from '../screen/RecordForm'
import { ExpenseFields } from './ExpenseFields'

/** The card with the form that registers or corrects one Expense; Register and Edit differ in what they pass. */
export function ExpenseEditor({
  idPrefix,
  initial,
  accounts,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  cancelTo,
  accountNote,
  children,
}: {
  idPrefix: string
  initial: ExpenseDraft
  accounts: Account[]
  save: (expense: ExpenseInput) => Promise<Outcome<Expense, ExpenseField>>
  onSaved: (expense: Expense) => void | Promise<void>
  submitLabel: string
  submittingLabel: string
  cancelTo: string
  accountNote?: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useExpenseForm({
    initial,
    accounts,
    save,
    onSaved,
  })

  return (
    <RecordForm
      form={form}
      onSubmit={submit}
      formErrors={errors.form}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo={cancelTo}
      fields={
        <ExpenseFields
          idPrefix={idPrefix}
          draft={draft}
          onChange={change}
          errors={errors}
          accounts={accounts}
          accountNote={accountNote}
        />
      }
    >
      {children}
    </RecordForm>
  )
}
