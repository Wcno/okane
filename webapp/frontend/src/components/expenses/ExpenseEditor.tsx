import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../../accounts/api'
import type { Expense, ExpenseField, ExpenseInput } from '../../expenses/api'
import type { ExpenseDraft } from '../../expenses/form'
import type { Outcome } from '../../lib/http'
import { useExpenseForm } from '../../expenses/useExpenseForm'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from '../screen/Screen'
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
    <section className={`${cardClassName} max-w-[34rem]`}>
      <form ref={form} onSubmit={submit} noValidate className="space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

        <ExpenseFields
          idPrefix={idPrefix}
          draft={draft}
          onChange={change}
          errors={errors}
          accounts={accounts}
          accountNote={accountNote}
        />

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
          <Link to={cancelTo} className={`${secondaryButtonClassName} sm:flex-1`}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
      {children}
    </section>
  )
}
