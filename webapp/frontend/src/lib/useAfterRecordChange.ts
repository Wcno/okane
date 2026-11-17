import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentAccount } from '../accounts/api'
import type { ScreenNotice } from './notice'

/** What happened to a record; the notice says it in Spanish. */
export type RecordChange = 'created' | 'updated' | 'deleted'

/**
 * What every change of a record of money on a full screen ends with: tell the
 * other screens, then go back to the list with a notice that names the new Balance.
 */
export function useAfterRecordChange<Record extends { accountId: number }>({
  listPath,
  announce,
  notice,
}: {
  listPath: string
  announce: () => void
  notice: (change: RecordChange, record: Record, account: Awaited<ReturnType<typeof currentAccount>>) => string
}) {
  const navigate = useNavigate()
  return useCallback(
    async (change: RecordChange, record: Record) => {
      const account = await currentAccount(record.accountId)
      announce()
      const state: ScreenNotice = { notice: notice(change, record, account) }
      navigate(listPath, { state })
    },
    [navigate, listPath, announce, notice],
  )
}
