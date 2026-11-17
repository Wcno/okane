import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentAccount } from '../accounts/api'
import type { ScreenNotice } from '../lib/notice'
import type { Expense } from './api'
import { savedNotice, type ExpenseChange } from './notices'
import { announceExpenseRevision } from './revision'

/**
 * What every change of an Expense on a full screen ends with: tell the other
 * screens, then go back to the list with a notice that names the new Balance.
 */
export function useAfterExpenseChange() {
  const navigate = useNavigate()
  return useCallback(
    async (change: ExpenseChange, expense: Pick<Expense, 'amount' | 'categoryId' | 'accountId'>) => {
      const account = await currentAccount(expense.accountId)
      announceExpenseRevision()
      const state: ScreenNotice = { notice: savedNotice(change, expense, account) }
      navigate('/expenses', { state })
    },
    [navigate],
  )
}
