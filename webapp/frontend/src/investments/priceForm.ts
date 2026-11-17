import { MAX_QUANTITY_DECIMALS, parseQuantity } from '../lib/amount'
import { isCalendarDay, todayInPanama } from '../lib/dates'
import type { PriceErrors, PriceInput } from './price'

/** What the form holds while the User types. */
export interface PriceDraft {
  value: string
  date: string
}

const VALUE_INVALID = `Escribe el precio mayor que cero, con ${MAX_QUANTITY_DECIMALS} decimales como máximo. Ejemplo: 187.35`
const VALUE_TOO_LARGE = 'El precio es demasiado grande. El máximo es $999,999,999,999.'
const DATE_INVALID = 'Elige la fecha del precio.'
const DATE_IN_FUTURE = 'La fecha no puede ser futura. Elige hoy o un día anterior.'

export type PriceOutcome = { ok: true; price: PriceInput } | { ok: false; errors: PriceErrors }

/** Checks what the browser can know before sending; api-service has the last word. */
export function validatePrice(draft: PriceDraft): PriceOutcome {
  const errors: PriceErrors = {}
  const value = parseQuantity(draft.value)

  if ('error' in value) errors.value = [value.error === 'too-large' ? VALUE_TOO_LARGE : VALUE_INVALID]
  if (!isCalendarDay(draft.date)) errors.date = [DATE_INVALID]
  else if (draft.date > todayInPanama()) errors.date = [DATE_IN_FUTURE]

  if (Object.keys(errors).length > 0 || 'error' in value) return { ok: false, errors }
  return { ok: true, price: { value: value.quantity, date: draft.date } }
}
