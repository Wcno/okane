import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFieldErrors } from './fieldErrors'
import type { FieldErrors, Outcome } from './http'
import { useSubmission } from './useSubmission'

export type Validation<Input, Field extends string> =
  | { ok: true; input: Input }
  | { ok: false; errors: FieldErrors<Field> }

/**
 * The state of a form that registers or corrects one record: the draft, what is
 * wrong with it and the submit. Validation runs in the browser first; api-service
 * has the last word and its errors land on the same fields. A field's error goes
 * away when that field changes (plus the ones `affectedBy` says depend on it),
 * and after the errors show, the keyboard goes to the first field that needs a fix.
 */
export function useRecordForm<Draft extends object, Field extends string, Input, Saved>({
  initial,
  validate,
  affectedBy,
  save,
  onSaved,
}: {
  initial: Draft
  validate: (draft: Draft) => Validation<Input, Field>
  /** Other fields whose errors the change of these ones may have resolved. */
  affectedBy?: (patch: Partial<Draft>) => Field[]
  save: (input: Input) => Promise<Outcome<Saved, Field>>
  onSaved: (saved: Saved) => void | Promise<void>
}) {
  const { isSubmitting, submit: write } = useSubmission()
  const form = useRef<HTMLFormElement>(null)
  const [draft, setDraft] = useState(initial)
  const { errors, setErrors, clearErrors } = useFieldErrors<Field>()
  const [attention, setAttention] = useState(0)

  useEffect(() => {
    if (attention > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attention])

  const showErrors = (found: FieldErrors<Field>) => {
    setErrors(found)
    setAttention((count) => count + 1)
  }

  const change = (patch: Partial<Draft>) => {
    setDraft((previous) => ({ ...previous, ...patch }))
    clearErrors(...(Object.keys(patch) as Field[]), ...(affectedBy?.(patch) ?? []))
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
    const outcome = await write(() => save(checked.input), onSaved)
    if (outcome && !outcome.ok) showErrors(outcome.errors)
  }

  return { form, draft, change, errors, isSubmitting, submit }
}
