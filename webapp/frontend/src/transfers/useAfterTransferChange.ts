import { currentAccounts, type Account } from '../accounts/api'
import { useAfterRecordChange } from '../lib/useAfterRecordChange'
import type { Transfer } from './api'
import { savedTransferNotice } from './notices'
import { announceTransferRevision } from './revision'

/**
 * What every change of a Transfer ends with: tell the other screens, then go
 * back to the list with a notice that names both new Balances.
 */
export const useAfterTransferChange = () =>
  useAfterRecordChange<Pick<Transfer, 'amount' | 'sourceAccountId' | 'destinationAccountId'>, Account>({
    listPath: '/transfers',
    announce: announceTransferRevision,
    loadAccounts: (transfer) => currentAccounts([transfer.sourceAccountId, transfer.destinationAccountId]),
    notice: savedTransferNotice,
  })
