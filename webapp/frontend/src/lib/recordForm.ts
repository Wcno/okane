import type { Account } from '../accounts/api'
import { MAX_AMOUNT_TEXT, parsePositiveAmount } from './amount'
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

/** What every record of money holds, whatever Accounts it names. */
export type MoneyDraft = Pick<RecordDraft, 'amount' | 'date' | 'description'>

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

export interface CheckedMoney {
  errors: FieldErrors<'amount' | 'date' | 'description'>
  /** The amount as the API takes it, or null while it is not a valid one. */
  amount: string | null
  description: string
}

export interface CheckedRecord extends Omit<CheckedMoney, 'errors'> {
  errors: FieldErrors<RecordField>
  account: Account | undefined
}

/**
 * The checks every record of money shares, whatever Accounts it names:
 * the amount, the day and the description. The day may not precede the start
 * of any of the Accounts `involved`; with more than one, the message names the Account.
 * "Today" is the Panama day at the moment of the check, so a form left open
 * past midnight follows the new day.
 */
export function checkMoney(draft: MoneyDraft, involved: Account[], dateInvalid: string): CheckedMoney {
  const today = todayInPanama()
  const errors: CheckedMoney['errors'] = {}
  const parsed = parsePositiveAmount(draft.amount)
  const description = draft.description.trim()

  if ('error' in parsed) errors.amount = [parsed.error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID]
  if (!isCalendarDay(draft.date)) errors.date = [dateInvalid]
  else if (draft.date > today) errors.date = [DATE_IN_FUTURE]
  else {
    const late = involved.find((account) => draft.date < account.openingDate)
    if (late) {
      const named = involved.length > 1 ? ` ${late.name}` : ''
      errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta${named} (${formatDay(late.openingDate)}).`]
    }
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) errors.description = [DESCRIPTION_TOO_LONG]

  return { errors, amount: 'amount' in parsed ? parsed.amount : null, description }
}

/** The checks of a record of money that names one Account (an Expense, an Income). */
export function checkRecord(draft: RecordDraft, accounts: Account[], wording: RecordWording): CheckedRecord {
  const account = accounts.find((candidate) => candidate.id === draft.accountId)
  const { errors, ...checked } = checkMoney(draft, account ? [account] : [], wording.dateInvalid)
  const withAccount: FieldErrors<RecordField> = { ...errors }
  if (account === undefined) withAccount.accountId = [wording.accountRequired]
  return { ...checked, errors: withAccount, account }
}
