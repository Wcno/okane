import { MAX_AMOUNT_TEXT, parsePositiveAmount, typedAmount } from './amount'
import { formatDay, isCalendarDay, todayInPanama } from './dates'
import type { FieldErrors } from './http'

/** What the form of a record of money (an Expense, an Income) holds while the User types. */
export interface RecordDraft {
  amount: string
  accountId: number | null
  date: string
  description: string
}

export type RecordField = 'amount' | 'accountId' | 'date' | 'description'

/** What the checks read of an Account: which one it is and the first day it can hold a record. */
export interface RecordAccount {
  id: number
  openingDate: string
}

export const DESCRIPTION_MAX_LENGTH = 140

const AMOUNT_TOO_LARGE = `El monto es demasiado grande. El máximo es ${MAX_AMOUNT_TEXT}.`
const AMOUNT_INVALID = 'Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50'
const DATE_IN_FUTURE = 'La fecha no puede ser futura. Elige hoy o un día anterior.'
const DESCRIPTION_TOO_LONG = `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`

/** The messages that name the kind of record: whose money moved, which date. */
export interface RecordWording {
  accountRequired: string
  dateInvalid: string
}

export interface CheckedRecord {
  errors: FieldErrors<RecordField>
  /** The amount as the API takes it, or null while it is not a valid one. */
  amount: string | null
  account: RecordAccount | undefined
  description: string
}

/**
 * The checks every record of money shares, with what the browser can know
 * before sending; api-service has the last word. "Today" is the Panama day at
 * the moment of the check, so a form left open past midnight follows the new day.
 */
export function checkRecord(draft: RecordDraft, accounts: RecordAccount[], wording: RecordWording): CheckedRecord {
  const today = todayInPanama()
  const errors: FieldErrors<RecordField> = {}
  const parsed = parsePositiveAmount(draft.amount)
  const description = draft.description.trim()
  const account = accounts.find((candidate) => candidate.id === draft.accountId)

  if ('error' in parsed) errors.amount = [parsed.error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID]
  if (account === undefined) errors.accountId = [wording.accountRequired]
  if (!isCalendarDay(draft.date)) errors.date = [wording.dateInvalid]
  else if (draft.date > today) errors.date = [DATE_IN_FUTURE]
  else if (account !== undefined && draft.date < account.openingDate) {
    errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta (${formatDay(account.openingDate)}).`]
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) errors.description = [DESCRIPTION_TOO_LONG]

  return { errors, amount: typedAmount(draft.amount), account, description }
}
