import type { Account } from '../accounts/api'
import { MAX_AMOUNT_TEXT, parsePositiveAmount } from '../lib/amount'
import { formatDay, isCalendarDay, todayInPanama } from '../lib/dates'
import type { Validation } from '../lib/useRecordForm'
import type { TransferErrors, TransferField, TransferInput } from './api'

/** What the form holds while the User types. */
export interface TransferDraft {
  amount: string
  sourceAccountId: number | null
  destinationAccountId: number | null
  date: string
  description: string
}

export const DESCRIPTION_MAX_LENGTH = 140

const AMOUNT_TOO_LARGE = `El monto es demasiado grande. El máximo es ${MAX_AMOUNT_TEXT}.`
const AMOUNT_INVALID = 'Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 250.00'
const SOURCE_REQUIRED = 'Elige la Cuenta de la que sale el dinero.'
const DESTINATION_REQUIRED = 'Elige la Cuenta a la que llega el dinero.'
const SAME_ACCOUNT = 'El origen y el destino deben ser Cuentas distintas.'
const DATE_INVALID = 'Elige la fecha de la transferencia.'
const DATE_IN_FUTURE = 'La fecha no puede ser futura. Elige hoy o un día anterior.'
const DESCRIPTION_TOO_LONG = `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`

/** The amount to show a consequence for, or null while what is typed is not one. */
export function typedAmount(text: string): string | null {
  const parsed = parsePositiveAmount(text)
  return 'amount' in parsed ? parsed.amount : null
}

/**
 * Checks what the browser can know before sending; api-service has the last
 * word. `accounts` are the ones the draft may name. "Today" is the Panama day
 * at the moment of the check, so a form left open past midnight follows the new day.
 */
export function validateTransfer(
  draft: TransferDraft,
  context: { accounts: Account[] },
): Validation<TransferInput, TransferField> {
  const today = todayInPanama()
  const errors: TransferErrors = {}
  const parsed = parsePositiveAmount(draft.amount)
  const description = draft.description.trim()
  const find = (id: number | null) => context.accounts.find((candidate) => candidate.id === id)
  const source = find(draft.sourceAccountId)
  const destination = find(draft.destinationAccountId)

  if ('error' in parsed) errors.amount = [parsed.error === 'too-large' ? AMOUNT_TOO_LARGE : AMOUNT_INVALID]
  if (source === undefined) errors.sourceAccountId = [SOURCE_REQUIRED]
  if (destination === undefined) errors.destinationAccountId = [DESTINATION_REQUIRED]
  else if (destination.id === source?.id) errors.destinationAccountId = [SAME_ACCOUNT]

  if (!isCalendarDay(draft.date)) errors.date = [DATE_INVALID]
  else if (draft.date > today) errors.date = [DATE_IN_FUTURE]
  else {
    const late = [source, destination].find((account) => account !== undefined && draft.date < account.openingDate)
    if (late) {
      errors.date = [`La fecha no puede ser anterior al inicio del registro de la Cuenta ${late.name} (${formatDay(late.openingDate)}).`]
    }
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) errors.description = [DESCRIPTION_TOO_LONG]

  if (Object.keys(errors).length > 0 || 'error' in parsed || source === undefined || destination === undefined) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    input: {
      amount: parsed.amount,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
      date: draft.date,
      description,
    },
  }
}

/** The Accounts a new Transfer starts on: the first two offered, so the common case needs no choosing. */
export function chooseDefaultAccounts(offered: Account[]): Pick<TransferDraft, 'sourceAccountId' | 'destinationAccountId'> {
  return { sourceAccountId: offered[0]?.id ?? null, destinationAccountId: offered[1]?.id ?? null }
}
