import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Account } from '../accounts/api'
import { useWrite } from '../lib/useWrite'
import type { Expense, ExpenseErrors, ExpenseInput, Outcome } from './api'
import { validateExpense, type ExpenseDraft } from './form'

/**
 * The state of a form that registers or corrects an Expense: the draft, what
 * is wrong with it and the submit. Validation runs in the browser first;
 * api-service has the last word, and its errors land on the same fields.
 */
export function useExpenseForm({
  initial,
  accounts,
  today,
  save,
  onSaved,
}: {
  initial: ExpenseDraft
  accounts: Account[]
  today: string
  save: (expense: ExpenseInput) => Promise<Outcome<Expense>>
  onSaved: (expense: Expense) => void | Promise<void>
}) {
  const write = useWrite()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<ExpenseErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attention, setAttention] = useState(0)

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: ExpenseErrors) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<ExpenseDraft>) => setDraft((previous) => ({ ...previous, ...patch }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateExpense(draft, { accounts, today })
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    const outcome = await write(() => save(checked.expense))
    if (!outcome.ok) {
      setIsSubmitting(false)
      showErrors(outcome.errors)
      return
    }
    try {
      await onSaved(outcome.value)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
