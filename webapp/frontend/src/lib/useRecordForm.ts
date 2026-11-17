import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useFieldErrors } from './useFieldErrors'
import type { FieldErrors, Outcome } from './http'
import { useSubmission } from './useSubmission'

export type Validated<Input, Field extends string> =
  | { ok: true; value: Input }
  | { ok: false; errors: FieldErrors<Field> }

/**
 * The state of a form that registers or corrects a record of money: the draft,
 * what is wrong with it and the submit. `validate` runs in the browser first;
 * api-service has the last word, and its errors land on the same fields.
 */
export function useRecordForm<Draft extends object, Field extends string, Input, Saved>({
  initial,
  validate,
  dateDependsOn = [],
  save,
  onSaved,
}: {
  initial: Draft
  validate: (draft: Draft) => Validated<Input, Field>
  /** The draft fields whose change re-judges the date: the Accounts, whose start the date may not precede. */
  dateDependsOn?: ReadonlyArray<keyof Draft>
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
    const fields = Object.keys(patch) as Field[]
    const changesTheDate = dateDependsOn.some((key) => key in patch)
    clearErrors(...(changesTheDate ? [...fields, 'date' as Field] : fields))
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
