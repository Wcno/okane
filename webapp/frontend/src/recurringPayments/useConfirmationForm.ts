import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Account } from '../accounts/api'
import type { Outcome } from '../lib/http'
import { useFieldErrors } from '../lib/useFieldErrors'
import { useSubmission } from '../lib/useSubmission'
import type { Confirmation, ConfirmationErrors, ConfirmationField, RecurringPaymentOccurrence } from './api'
import { validateConfirmation, type ConfirmationDraft } from './form'

/** The fields whose errors depend on what was changed: the date is checked against the Account's start. */
const affectedFields = (patch: Partial<ConfirmationDraft>): ConfirmationField[] => {
  const fields = Object.keys(patch) as ConfirmationField[]
  return 'accountId' in patch ? [...fields, 'date'] : fields
}

/** The state of the form that confirms an occurrence; it works like the one of an Expense. */
export function useConfirmationForm({
  initial,
  accounts,
  enteredOn,
  save,
  onSaved,
}: {
  initial: ConfirmationDraft
  accounts: Account[]
  enteredOn: string | null
  save: (confirmation: Confirmation) => Promise<Outcome<RecurringPaymentOccurrence, ConfirmationField>>
  onSaved: (occurrence: RecurringPaymentOccurrence, confirmation: Confirmation) => void | Promise<void>
}) {
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<ConfirmationField>()
  const [attention, setAttention] = useState(0)

  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: ConfirmationErrors) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<ConfirmationDraft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...affectedFields(patch))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validateConfirmation(draft, { accounts, enteredOn })
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await write(
      () => save(checked.confirmation),
      (occurrence) => onSaved(occurrence, checked.confirmation),
    )
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
