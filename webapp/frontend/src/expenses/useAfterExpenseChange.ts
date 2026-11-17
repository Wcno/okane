import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAccounts } from '../accounts/api'
import type { ScreenNotice } from '../lib/notice'
import type { Expense } from './api'
import { announceExpenseChange } from './changes'
import { savedNotice } from './notices'

/** The Account as it is now, read after a change; the notice goes without it if it cannot be read. */
async function readAccount(accountId: number) {
  try {
    return (await listAccounts()).find((account) => account.id === accountId)
  } catch {
    return undefined
  }
}

/**
 * What every change of an Expense ends with: tell the other screens, then go
 * back to the list with a notice that names the new Balance. `verb` is past tense.
 */
export function useAfterExpenseChange() {
  const navigate = useNavigate()
  return useCallback(
    async (verb: string, expense: Pick<Expense, 'amount' | 'categoryId' | 'accountId'>) => {
      const account = await readAccount(expense.accountId)
      announceExpenseChange()
      const state: ScreenNotice = { notice: savedNotice(verb, expense, account) }
      navigate('/expenses', { state })
    },
    [navigate],
  )
}
