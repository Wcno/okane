import type { Account } from '../accounts/api'
import { DESCRIPTION_MAX_LENGTH } from '../expenses/form'
import { parseExpenseAmount } from '../expenses/form'
import { MAX_AMOUNT_TEXT } from '../lib/amount'
import { formatDay, isCalendarDay, todayInPanama } from '../lib/dates'
import type {
  Confirmation,
  ConfirmationErrors,
  RecurringPaymentErrors,
  RecurringPaymentInput,
} from './api'

const AMOUNT_TOO_LARGE = `El monto es demasiado grande. El máximo es ${MAX_AMOUNT_TEXT}.`
const AMOUNT_INVALID = 'Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50'
const ACCOUNT_REQUIRED = 'Elige la Cuenta de la que sale el pago.'

const amountError = (error: 'invalid' | 'too-large') => (error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID)

/** What the form of a rule holds while the User types. */
export interface RecurringPaymentDraft {
  description: string
  amount: string
  categoryId: number | null
  accountId: number | null
  /** Typed as text so an empty or half-typed day is not a number yet. */
  dayOfMonth: string
  startDate: string
}

const DAY_OF_MONTH = /^\d{1,2}$/

export type RecurringPaymentOutcome =
  | { ok: true; rule: RecurringPaymentInput }
  | { ok: false; errors: RecurringPaymentErrors }

/**
 * Checks what the browser can know before sending; api-service has the last
 * word. `accounts` are the ones the rule may name.
 */
export function validateRecurringPayment(
  draft: RecurringPaymentDraft,
  context: { accounts: Account[] },
): RecurringPaymentOutcome {
  const errors: RecurringPaymentErrors = {}
  const parsed = parseExpenseAmount(draft.amount)
  const description = draft.description.trim()
  const account = context.accounts.find((candidate) => candidate.id === draft.accountId)
  const day = DAY_OF_MONTH.test(draft.dayOfMonth.trim()) ? Number(draft.dayOfMonth.trim()) : null

  if ('error' in parsed) errors.amount = [amountError(parsed.error)]
  if (draft.categoryId === null) errors.categoryId = ['Elige la Categoría del pago.']
  if (account === undefined) errors.accountId = [ACCOUNT_REQUIRED]
  if (day === null || day < 1 || day > 31) errors.dayOfMonth = ['Escribe un día del mes entre 1 y 31.']
  if (!isCalendarDay(draft.startDate)) errors.startDate = ['Elige desde qué fecha se reserva el pago.']
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = [`La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`]
  }

  if (
    Object.keys(errors).length > 0 ||
    'error' in parsed ||
    draft.categoryId === null ||
    account === undefined ||
    day === null
  ) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    rule: {
      description,
      amount: parsed.amount,
      accountId: account.id,
      categoryId: draft.categoryId,
      dayOfMonth: day,
      startDate: draft.startDate,
    },
  }
}

/** What the confirmation form holds while the User types. */
export interface ConfirmationDraft {
  amount: string
  accountId: number | null
  date: string
}

export type ConfirmationOutcome =
  | { ok: true; confirmation: Confirmation }
  | { ok: false; errors: ConfirmationErrors }

/**
 * The real payment: a positive amount, an Account that takes Expenses and a
 * day that is today or past, never before the reservation began nor before the
 * Account did. "Today" is the Panama day when the User presses the button.
 */
export function validateConfirmation(
  draft: ConfirmationDraft,
  context: { accounts: Account[]; reservedFrom: string | null },
): ConfirmationOutcome {
  const today = todayInPanama()
  const errors: ConfirmationErrors = {}
  const parsed = parseExpenseAmount(draft.amount)
  const account = context.accounts.find((candidate) => candidate.id === draft.accountId)

  if ('error' in parsed) errors.amount = [amountError(parsed.error)]
  if (account === undefined) errors.accountId = [ACCOUNT_REQUIRED]
  if (!isCalendarDay(draft.date)) errors.date = ['Elige el día en que pagaste.']
  else if (draft.date > today) errors.date = ['La fecha no puede ser futura. Elige hoy o un día anterior.']
  else if (context.reservedFrom !== null && draft.date < context.reservedFrom) {
    errors.date = [`La fecha no puede ser anterior a la reserva (${formatDay(context.reservedFrom)}).`]
  } else if (account !== undefined && draft.date < account.openingDate) {
    errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta (${formatDay(account.openingDate)}).`]
  }

  if (Object.keys(errors).length > 0 || 'error' in parsed || account === undefined) return { ok: false, errors }
  return { ok: true, confirmation: { amount: parsed.amount, accountId: account.id, date: draft.date } }
}
