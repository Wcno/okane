import type { Account } from '../accounts/api'
import { currentAccount } from '../accounts/api'
import { useAfterRecordChange } from '../lib/useAfterRecordChange'
import type { Expense } from './api'
import { savedNotice } from './notices'
import { announceMovementsRevision } from '../movements/revision'

/**
 * What every change of an Expense on a full screen ends with: tell the other
 * screens, then go back to the list with a notice that names the new Balance.
 */
export const useAfterExpenseChange = () =>
  useAfterRecordChange<Pick<Expense, 'amount' | 'categoryId' | 'accountId'>, Account>({
    listPath: '/expenses',
    announce: announceMovementsRevision,
    loadAccounts: async (expense) => [await currentAccount(expense.accountId)],
    notice: (change, expense, [account]) => savedNotice(change, expense, account),
  })
