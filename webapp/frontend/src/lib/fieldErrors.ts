import { useCallback, useState } from 'react'
import type { FieldErrors } from './http'

/** The errors without those of `fields`; the same object when there is nothing to drop. */
export function withoutErrors<Field extends string>(errors: FieldErrors<Field>, fields: readonly Field[]) {
  if (!fields.some((field) => errors[field] !== undefined)) return errors
  const kept = { ...errors }
  for (const field of fields) delete kept[field]
  return kept
}

/**
 * The errors a form shows. A field's error goes away as soon as the User
 * changes that field, so a red border never outlives the text that caused it.
 */
export function useFieldErrors<Field extends string>() {
  const [errors, setErrors] = useState<FieldErrors<Field>>({})
  const clearErrors = useCallback(
    (...fields: Field[]) => setErrors((current) => withoutErrors(current, fields)),
    [],
  )
  return { errors, setErrors, clearErrors }
}
