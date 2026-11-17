import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Account } from '../accounts/api'
import type { Outcome } from '../lib/http'
import { useFieldErrors } from '../lib/useFieldErrors'
import { useSubmission } from '../lib/useSubmission'
import type { RecurringPayment, RecurringPaymentErrors, RecurringPaymentField, RecurringPaymentInput } from './api'
import { validateRecurringPayment, type RecurringPaymentDraft } from './form'

/**
 * The state of the form that creates or corrects a rule: the draft, what is
 * wrong with it and the submit. Validation runs in the browser first;
 * api-service has the last word, and its errors land on the same fields.
 */
export function useRecurringPaymentForm({
  initial,
  accounts,
  save,
  onSaved,
}: {
  initial: RecurringPaymentDraft
  accounts: Account[]
  save: (rule: RecurringPaymentInput) => Promise<Outcome<RecurringPayment, RecurringPaymentField>>
  onSaved: (rule: RecurringPayment) => void | Promise<void>
}) {
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<RecurringPaymentField>()
  const [attention, setAttention] = useState(0)

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: RecurringPaymentErrors) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<RecurringPaymentDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...(Object.keys(patch) as RecurringPaymentField[]))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateRecurringPayment(draft, { accounts })
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await write(() => save(checked.rule), onSaved)
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
