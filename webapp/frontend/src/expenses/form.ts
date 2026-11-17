import type { Account } from '../accounts/api'
import type { ExpenseErrors, ExpenseInput } from './api'

/** What the form holds while the User types. */
export interface ExpenseDraft {
  amount: string
  categoryId: number | null
  accountId: number | null
  date: string
  description: string
}

export const DESCRIPTION_MAX_LENGTH = 140

const AMOUNT_INVALID = 'Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50'
const CATEGORY_REQUIRED = 'Elige la Categoría del gasto.'
const ACCOUNT_REQUIRED = 'Elige la Cuenta de la que salió el dinero.'
const DATE_INVALID = 'Elige la fecha del gasto.'
const DATE_IN_FUTURE = 'La fecha no puede ser futura. Elige hoy o un día anterior.'
const DESCRIPTION_TOO_LONG = `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`

const AMOUNT = /^(\d{1,12})(?:\.(\d{1,2}))?$/
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/

/** The amount as the decimal string the API takes, or null if it is not a positive amount in cents. */
export function parseAmount(text: string): string | null {
  const match = AMOUNT.exec(text.trim().replace(',', '.'))
  if (!match) return null
  const amount = `${match[1].replace(/^0+(?=\d)/, '')}.${(match[2] ?? '').padEnd(2, '0')}`
  return amount === '0.00' ? null : amount
}

export type ExpenseOutcome = { ok: true; expense: ExpenseInput } | { ok: false; errors: ExpenseErrors }

/**
 * Checks what the browser can know before sending; api-service has the last
 * word. `accounts` are the ones the draft may name, `today` a calendar day in Panama.
 */
export function validateExpense(
  draft: ExpenseDraft,
  context: { accounts: Account[]; today: string },
): ExpenseOutcome {
  const errors: ExpenseErrors = {}
  const amount = parseAmount(draft.amount)
  const description = draft.description.trim()
  const account = context.accounts.find((candidate) => candidate.id === draft.accountId)

  if (amount === null) errors.amount = [AMOUNT_INVALID]
  if (draft.categoryId === null) errors.categoryId = [CATEGORY_REQUIRED]
  if (account === undefined) errors.accountId = [ACCOUNT_REQUIRED]
  if (!CALENDAR_DAY.test(draft.date)) errors.date = [DATE_INVALID]
  else if (draft.date > context.today) errors.date = [DATE_IN_FUTURE]
  else if (account !== undefined && draft.date < account.openingDate) {
    errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta (${account.openingDate}).`]
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) errors.description = [DESCRIPTION_TOO_LONG]

  if (Object.keys(errors).length > 0 || amount === null || draft.categoryId === null || account === undefined) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    expense: { amount, categoryId: draft.categoryId, accountId: account.id, date: draft.date, description },
  }
}

/** The Account a new Expense starts on: the last one used, if it is still offered. */
export function chooseDefaultAccount(offered: Account[], lastUsedAccountId: number | null): number | null {
  const lastUsed = offered.find((account) => account.id === lastUsedAccountId)
  return (lastUsed ?? offered[0])?.id ?? null
}
