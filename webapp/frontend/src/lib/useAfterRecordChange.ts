import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentAccounts, type Account } from '../accounts/api'
import type { ScreenNotice } from './notice'
import type { RecordChange } from './recordChange'

/**
 * What every change of a record of money on a full screen ends with: tell the
 * other screens, then go back to the list with a notice that names the new
 * Balance of each Account the record touches.
 */
export function useAfterRecordChange<Record>({
  listPath,
  announce,
  accountIds,
  notice,
}: {
  listPath: string
  announce: () => void
  /** The Accounts whose Balance the record moves: one, or two for a Transfer. */
  accountIds: (record: Record) => number[]
  notice: (change: RecordChange, record: Record, accounts: Array<Account | undefined>) => string
}) {
  const navigate = useNavigate()
  return useCallback(
    async (change: RecordChange, record: Record) => {
      const accounts = await currentAccounts(accountIds(record))
      announce()
      const state: ScreenNotice = { notice: notice(change, record, accounts) }
      navigate(listPath, { state })
    },
    [navigate, listPath, announce, accountIds, notice],
  )
}
