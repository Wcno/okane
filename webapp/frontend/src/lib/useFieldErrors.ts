import { useCallback, useState } from 'react'
import type { FieldErrors } from './http'
import { withoutErrors } from './fieldErrors'

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
