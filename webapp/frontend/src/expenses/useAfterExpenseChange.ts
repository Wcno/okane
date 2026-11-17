import { useAfterRecordChange } from '../lib/useAfterRecordChange'
import type { Expense } from './api'
import { savedNotice } from './notices'
import { announceExpenseRevision } from './revision'

/**
 * What every change of an Expense on a full screen ends with: tell the other
 * screens, then go back to the list with a notice that names the new Balance.
 */
export const useAfterExpenseChange = () =>
  useAfterRecordChange<Pick<Expense, 'amount' | 'categoryId' | 'accountId'>>({
    listPath: '/expenses',
    announce: announceExpenseRevision,
    notice: savedNotice,
  })
