import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Expense } from './api'
import { announceExpenseChange } from './changes'
import { currentAccount, savedNotice } from './notices'
import type { ExpensesNotice } from './presentation'

/**
 * What every change of an Expense ends with: tell the other screens, then go
 * back to the list with a notice that names the new Balance. `verb` is past tense.
 */
export function useAfterExpenseChange() {
  const navigate = useNavigate()
  return useCallback(
    async (verb: string, expense: Pick<Expense, 'amount' | 'categoryId' | 'accountId'>) => {
      const account = await currentAccount(expense.accountId)
      announceExpenseChange()
      const state: ExpensesNotice = { notice: savedNotice(verb, expense, account) }
      navigate('/expenses', { state })
    },
    [navigate],
  )
}
