import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScreenNotice } from './notice'
import type { RecordChange } from './recordChange'

/**
 * What every change of a record of money on a full screen ends with: tell the
 * other screens, then go back to the list with a notice that names the new Balance.
 * The caller brings the Account loader, so this shared layer stays free of features.
 */
export function useAfterRecordChange<Entry extends { accountId: number }, Account>({
  listPath,
  announce,
  loadAccount,
  notice,
}: {
  listPath: string
  announce: () => void
  loadAccount: (accountId: number) => Promise<Account | undefined>
  notice: (change: RecordChange, record: Entry, account: Account | undefined) => string
}) {
  const navigate = useNavigate()
  return useCallback(
    async (change: RecordChange, record: Entry) => {
      const account = await loadAccount(record.accountId)
      announce()
      const state: ScreenNotice = { notice: notice(change, record, account) }
      navigate(listPath, { state })
    },
    [navigate, listPath, announce, loadAccount, notice],
  )
}
