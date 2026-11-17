import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Account } from '../accounts/api'
import { useFieldErrors } from '../lib/useFieldErrors'
import type { Outcome } from '../lib/http'
import { useSubmission } from '../lib/useSubmission'
import type { Expense, ExpenseErrors, ExpenseField, ExpenseInput } from './api'
import { validateExpense, type ExpenseDraft } from './form'

/** The fields whose errors depend on what was changed: the date is checked against the Account's start. */
const affectedFields = (patch: Partial<ExpenseDraft>): ExpenseField[] => {
  const fields = Object.keys(patch) as ExpenseField[]
  return 'accountId' in patch ? [...fields, 'date'] : fields
}

/**
 * The state of a form that registers or corrects an Expense: the draft, what
 * is wrong with it and the submit. Validation runs in the browser first;
 * api-service has the last word, and its errors land on the same fields.
 */
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
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<ExpenseField>()
  const [attention, setAttention] = useState(0)

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: ExpenseErrors) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<ExpenseDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...affectedFields(patch))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateExpense(draft, { accounts })
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await write(() => save(checked.expense), onSaved)
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
