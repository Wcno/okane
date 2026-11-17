import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../../accounts/api'
import type { Expense, ExpenseInput, Outcome } from '../../expenses/api'
import type { ExpenseDraft } from '../../expenses/form'
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
  today,
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
  today: string
  save: (expense: ExpenseInput) => Promise<Outcome<Expense>>
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
    today,
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
          today={today}
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
