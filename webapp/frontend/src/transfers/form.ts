import type { Account } from '../accounts/api'
import { checkMoney, type MoneyDraft } from '../lib/recordForm'
import type { Validated } from '../lib/useRecordForm'
import type { TransferErrors, TransferField, TransferInput } from './api'

/** What the form holds while the User types. */
export interface TransferDraft extends MoneyDraft {
  sourceAccountId: number | null
  destinationAccountId: number | null
}

const SOURCE_REQUIRED = 'Elige la Cuenta de la que sale el dinero.'
const DESTINATION_REQUIRED = 'Elige la Cuenta a la que llega el dinero.'
const SAME_ACCOUNT = 'El origen y el destino deben ser Cuentas distintas.'
const DATE_INVALID = 'Elige la fecha de la transferencia.'

/**
 * Checks what the browser can know before sending; api-service has the last
 * word. `accounts` are the ones the draft may name. The amount, the day and the
 * description follow the rules every record of money shares; the day may not
 * precede the start of either Account.
 */
export function validateTransfer(
  draft: TransferDraft,
  context: { accounts: Account[] },
): Validated<TransferInput, TransferField> {
  const find = (id: number | null) => context.accounts.find((candidate) => candidate.id === id)
  const source = find(draft.sourceAccountId)
  const destination = find(draft.destinationAccountId)
  const involved = [source, destination].filter((account): account is Account => account !== undefined)
  const { errors: checked, amount, description } = checkMoney(draft, involved, DATE_INVALID)
  const errors: TransferErrors = { ...checked }

  if (source === undefined) errors.sourceAccountId = [SOURCE_REQUIRED]
  if (destination === undefined) errors.destinationAccountId = [DESTINATION_REQUIRED]
  else if (destination.id === source?.id) errors.destinationAccountId = [SAME_ACCOUNT]

  if (Object.keys(errors).length > 0 || amount === null || source === undefined || destination === undefined) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      amount,
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
