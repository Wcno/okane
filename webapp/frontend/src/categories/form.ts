import type { CategoryErrors, CategoryInput } from './api'

export const NAME_MAX_LENGTH = 40

/** What the form holds while the User types. */
export interface CategoryDraft {
  name: string
}

const NAME_REQUIRED = 'Escribe el nombre de la Categoría.'
const NAME_TOO_LONG = `El nombre puede tener hasta ${NAME_MAX_LENGTH} caracteres.`

export type CategoryOutcome = { ok: true; value: CategoryInput } | { ok: false; errors: CategoryErrors }

/** Checks what the browser can know before sending; api-service has the last word, repeated names included. */
export function validateCategory(draft: CategoryDraft): CategoryOutcome {
  const name = draft.name.split(/\s+/).filter(Boolean).join(' ')
  if (name === '') return { ok: false, errors: { name: [NAME_REQUIRED] } }
  if (name.length > NAME_MAX_LENGTH) return { ok: false, errors: { name: [NAME_TOO_LONG] } }
  return { ok: true, value: { name } }
}
