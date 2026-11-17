import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFieldErrors } from './useFieldErrors'
import type { FieldErrors, Outcome } from './http'
import type { RecordDraft } from './recordForm'
import { useSubmission } from './useSubmission'

export type Validated<Input, Field extends string> =
  | { ok: true; value: Input }
  | { ok: false; errors: FieldErrors<Field> }

/**
 * The state of a form that registers or corrects a record of money: the draft,
 * what is wrong with it and the submit. `validate` runs in the browser first;
 * api-service has the last word, and its errors land on the same fields.
 */
export function useRecordForm<Draft extends RecordDraft, Field extends string, Input, Saved>({
  initial,
  validate,
  save,
  onSaved,
}: {
  initial: Draft
  validate: (draft: Draft) => Validated<Input, Field>
  save: (input: Input) => Promise<Outcome<Saved, Field>>
  onSaved: (saved: Saved) => void | Promise<void>
}) {
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<Field>()
  const [attention, setAttention] = useState(0)

  // After the errors are on screen, the keyboard goes to the first field that needs a fix.
  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: FieldErrors<Field>) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<Draft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    // The date is checked against the Account's start, so changing the Account clears it too.
    const fields = Object.keys(patch) as Field[]
    clearErrors(...('accountId' in patch ? [...fields, 'date' as Field] : fields))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const checked = validate(draft)
    if (!checked.ok) {
      showErrors(checked.errors)
      return
    }
    setErrors({})
    const outcome = await write(() => save(checked.value), onSaved)
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
