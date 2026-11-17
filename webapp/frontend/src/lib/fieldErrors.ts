import type { FieldErrors } from './http'

/** The errors without those of `fields`; the same object when there is nothing to drop. */
export function withoutErrors<Field extends string>(errors: FieldErrors<Field>, fields: readonly Field[]) {
  if (!fields.some((field) => errors[field] !== undefined)) return errors
  const kept = { ...errors }
  for (const field of fields) delete kept[field]
  return kept
}
