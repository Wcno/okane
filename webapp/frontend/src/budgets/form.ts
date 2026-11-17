import { MAX_AMOUNT_TEXT, parseAmount, type ParsedAmount } from '../lib/amount'
import { isMonth } from '../lib/months'
import type { BudgetErrors, BudgetInput } from './api'

/** What the form holds while the User types. */
export interface BudgetDraft {
  categoryId: number | null
  month: string
  amount: string
}

const AMOUNT_TOO_LARGE = `El monto es demasiado grande. El máximo es ${MAX_AMOUNT_TEXT}.`
const AMOUNT_INVALID = 'Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 300.00'
const CATEGORY_REQUIRED = 'Elige la Categoría del Presupuesto.'
const MONTH_INVALID = 'Elige el mes del Presupuesto.'

/** A Budget takes a positive amount: zero and a negative one are as invalid as text. */
export function parseBudgetAmount(text: string): ParsedAmount {
  const parsed = parseAmount(text)
  if ('error' in parsed) return parsed
  return parsed.amount.startsWith('-') || parsed.amount === '0.00' ? { error: 'invalid' } : parsed
}

export type BudgetOutcome = { ok: true; budget: BudgetInput } | { ok: false; errors: BudgetErrors }

/** Checks what the browser can know before sending; api-service has the last word, uniqueness included. */
export function validateBudget(draft: BudgetDraft): BudgetOutcome {
  const errors: BudgetErrors = {}
  const parsed = parseBudgetAmount(draft.amount)

  if ('error' in parsed) errors.amount = [parsed.error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID]
  if (draft.categoryId === null) errors.categoryId = [CATEGORY_REQUIRED]
  if (!isMonth(draft.month)) errors.month = [MONTH_INVALID]

  if (Object.keys(errors).length > 0 || 'error' in parsed || draft.categoryId === null) return { ok: false, errors }
  return { ok: true, budget: { categoryId: draft.categoryId, month: draft.month, amount: parsed.amount } }
}
