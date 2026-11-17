import type { Account } from '../accounts/api'
import { checkRecord, type RecordDraft, type RecordWording } from '../lib/recordForm'
import type { ExpenseErrors, ExpenseInput } from './api'

/** What the form holds while the User types. */
export interface ExpenseDraft extends RecordDraft {
  categoryId: number | null
}

const CATEGORY_REQUIRED = 'Elige la Categoría del gasto.'
const wording: RecordWording = {
  accountRequired: 'Elige la Cuenta de la que salió el dinero.',
  dateInvalid: 'Elige la fecha del gasto.',
}

export type ExpenseOutcome = { ok: true; expense: ExpenseInput } | { ok: false; errors: ExpenseErrors }

/** Checks what the browser can know before sending; api-service has the last word. */
export function validateExpense(draft: ExpenseDraft, context: { accounts: Account[] }): ExpenseOutcome {
  const { errors, amount, account, description } = checkRecord(draft, context.accounts, wording)
  const expenseErrors: ExpenseErrors = { ...errors }
  if (draft.categoryId === null) expenseErrors.categoryId = [CATEGORY_REQUIRED]

  if (Object.keys(expenseErrors).length > 0 || amount === null || draft.categoryId === null || account === undefined) {
    return { ok: false, errors: expenseErrors }
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
