import type { Account } from '../accounts/api'
import { currentAccount } from '../accounts/api'
import { useAfterRecordChange } from '../lib/useAfterRecordChange'
import type { Income } from './api'
import { savedIncomeNotice } from './notices'
import { announceIncomeRevision } from './revision'

/**
 * What every change of an Income ends with: tell the other screens, then go
 * back to the list with a notice that names the new Balance.
 */
export const useAfterIncomeChange = () =>
  useAfterRecordChange<Pick<Income, 'amount' | 'accountId'>, Account>({
    listPath: '/incomes',
    announce: announceIncomeRevision,
    loadAccount: currentAccount,
    notice: savedIncomeNotice,
  })
