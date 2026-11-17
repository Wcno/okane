import type { Account } from '../accounts/api'
import { checkRecord, type RecordDraft, type RecordWording } from '../lib/recordForm'
import type { IncomeErrors, IncomeInput } from './api'

/** What the form holds while the User types; an Income has no Category. */
export type IncomeDraft = RecordDraft

const wording: RecordWording = {
  accountRequired: 'Elige la Cuenta a la que entró el dinero.',
  dateInvalid: 'Elige la fecha del ingreso.',
}

export type IncomeOutcome = { ok: true; income: IncomeInput } | { ok: false; errors: IncomeErrors }

/** Checks what the browser can know before sending; api-service has the last word. */
export function validateIncome(draft: IncomeDraft, context: { accounts: Account[] }): IncomeOutcome {
  const { errors, amount, account, description } = checkRecord(draft, context.accounts, wording)
  if (Object.keys(errors).length > 0 || amount === null || account === undefined) return { ok: false, errors }
  return { ok: true, income: { amount, accountId: account.id, date: draft.date, description } }
}

/** The Account a new Income starts on: the first one offered, which is where the User most likely is paid. */
export const defaultAccountId = (offered: Account[]): number | null => offered[0]?.id ?? null
