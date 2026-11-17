import type { Account } from '../accounts/api'
import { parsePositiveAmount } from '../lib/amount'
import { formatDay, isCalendarDay } from '../lib/dates'
import {
  AMOUNT_INVALID,
  AMOUNT_TOO_LARGE,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_TOO_LONG,
  checkRecord,
  type RecordWording,
} from '../lib/recordForm'
import type { Validated } from '../lib/useRecordForm'
import type {
  Confirmation,
  ConfirmationField,
  RecurringPaymentField,
  RecurringPaymentInput,
} from './api'

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

/**
 * Checks what the browser can know before sending; api-service has the last
 * word. `accounts` are the ones the rule may name. A rule may start in the future.
 */
export function validateRecurringPayment(
  draft: RecurringPaymentDraft,
  context: { accounts: Account[] },
): Validated<RecurringPaymentInput, RecurringPaymentField> {
  const errors: Partial<Record<RecurringPaymentField, string[]>> = {}
  const parsed = parsePositiveAmount(draft.amount)
  const description = draft.description.trim()
  const account = context.accounts.find((candidate) => candidate.id === draft.accountId)
  const day = DAY_OF_MONTH.test(draft.dayOfMonth.trim()) ? Number(draft.dayOfMonth.trim()) : null

  if ('error' in parsed) errors.amount = [parsed.error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID]
  if (draft.categoryId === null) errors.categoryId = ['Elige la Categoría del pago.']
  if (account === undefined) errors.accountId = ['Elige la Cuenta de la que sale el pago.']
  if (day === null || day < 1 || day > 31) errors.dayOfMonth = ['Escribe un día del mes entre 1 y 31.']
  if (!isCalendarDay(draft.startDate)) errors.startDate = ['Elige desde qué fecha se reserva el pago.']
  if (description.length > DESCRIPTION_MAX_LENGTH) errors.description = [DESCRIPTION_TOO_LONG]

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
    value: {
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

const confirmationWording: RecordWording = {
  accountRequired: 'Elige la Cuenta de la que salió el dinero.',
  dateInvalid: 'Elige el día en que pagaste.',
}

/**
 * The real payment: it is checked like any Expense, and its day is never
 * before the reservation began. "Today" is the Panama day when the User presses the button.
 */
export function validateConfirmation(
  draft: ConfirmationDraft,
  context: { accounts: Account[]; reservedFrom: string },
): Validated<Confirmation, ConfirmationField> {
  const { errors, amount, account } = checkRecord({ ...draft, description: '' }, context.accounts, confirmationWording)
  if (errors.date === undefined && draft.date < context.reservedFrom) {
    errors.date = [`La fecha no puede ser anterior a la entrada de la reserva (${formatDay(context.reservedFrom)}).`]
  }
  if (Object.keys(errors).length > 0 || amount === null || account === undefined) return { ok: false, errors }
  return { ok: true, value: { amount, accountId: account.id, date: draft.date } }
}
