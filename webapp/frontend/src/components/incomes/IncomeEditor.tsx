import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import type { Income, IncomeField, IncomeInput } from '../../incomes/api'
import type { IncomeDraft } from '../../incomes/form'
import { useIncomeForm } from '../../incomes/useIncomeForm'
import type { Outcome } from '../../lib/http'
import { RecordEditor } from '../record/RecordEditor'
import { IncomeFields } from './IncomeFields'

/** The card with the form that registers or corrects one Income; Register and Edit differ in what they pass. */
export function IncomeEditor({
  initial,
  accounts,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  accountNote,
  children,
}: {
  initial: IncomeDraft
  accounts: Account[]
  save: (income: IncomeInput) => Promise<Outcome<Income, IncomeField>>
  onSaved: (income: Income) => void | Promise<void>
  submitLabel: string
  submittingLabel: string
  accountNote?: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useIncomeForm({ initial, accounts, save, onSaved })

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo="/incomes"
      fields={
        <IncomeFields
          idPrefix="income"
          draft={draft}
          onChange={change}
          errors={errors}
          accounts={accounts}
          accountNote={accountNote}
        />
      }
    >
      {children}
    </RecordEditor>
  )
}
