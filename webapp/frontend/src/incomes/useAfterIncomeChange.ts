import { useAfterRecordChange } from '../lib/useAfterRecordChange'
import type { Income } from './api'
import { savedIncomeNotice } from './notices'
import { announceIncomeRevision } from './revision'

/**
 * What every change of an Income ends with: tell the other screens, then go
 * back to the list with a notice that names the new Balance.
 */
export const useAfterIncomeChange = () =>
  useAfterRecordChange<Pick<Income, 'amount' | 'accountId'>>({
    listPath: '/incomes',
    announce: announceIncomeRevision,
    accountIds: (income) => [income.accountId],
    notice: (change, income, [account]) => savedIncomeNotice(change, income, account),
  })
