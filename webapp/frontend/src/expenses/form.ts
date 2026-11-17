import type { Account } from '../accounts/api'
import { MAX_AMOUNT_TEXT, parsePositiveAmount } from '../lib/amount'
import { formatDay, isCalendarDay, todayInPanama } from '../lib/dates'
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

const AMOUNT_TOO_LARGE = `El monto es demasiado grande. El máximo es ${MAX_AMOUNT_TEXT}.`
const AMOUNT_INVALID = 'Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50'
const CATEGORY_REQUIRED = 'Elige la Categoría del gasto.'
const ACCOUNT_REQUIRED = 'Elige la Cuenta de la que salió el dinero.'
const DATE_INVALID = 'Elige la fecha del gasto.'
const DATE_IN_FUTURE = 'La fecha no puede ser futura. Elige hoy o un día anterior.'
const DESCRIPTION_TOO_LONG = `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`


/** The amount to show a consequence for, or null while what is typed is not one. */
export function typedAmount(text: string): string | null {
  const parsed = parsePositiveAmount(text)
  return 'amount' in parsed ? parsed.amount : null
}

export type ExpenseOutcome = { ok: true; expense: ExpenseInput } | { ok: false; errors: ExpenseErrors }

/**
 * Checks what the browser can know before sending; api-service has the last
 * word. `accounts` are the ones the draft may name. "Today" is the Panama day
 * at the moment of the check, so a form left open past midnight follows the new day.
 */
export function validateExpense(draft: ExpenseDraft, context: { accounts: Account[] }): ExpenseOutcome {
  const today = todayInPanama()
  const errors: ExpenseErrors = {}
  const parsed = parsePositiveAmount(draft.amount)
  const amount = 'amount' in parsed ? parsed.amount : null
  const description = draft.description.trim()
  const account = context.accounts.find((candidate) => candidate.id === draft.accountId)

  if ('error' in parsed) errors.amount = [parsed.error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID]
  if (draft.categoryId === null) errors.categoryId = [CATEGORY_REQUIRED]
  if (account === undefined) errors.accountId = [ACCOUNT_REQUIRED]
  if (!isCalendarDay(draft.date)) errors.date = [DATE_INVALID]
  else if (draft.date > today) errors.date = [DATE_IN_FUTURE]
  else if (account !== undefined && draft.date < account.openingDate) {
    errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta (${formatDay(account.openingDate)}).`]
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
