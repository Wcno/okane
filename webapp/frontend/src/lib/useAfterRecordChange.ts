import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScreenNotice } from './notice'
import type { RecordChange } from './recordChange'

/**
 * What every change of a record of money on a full screen ends with: tell the
 * other screens, then go back to the list with a notice that names the new
 * Balance of each Account the record touches: one, or two for a Transfer.
 * The caller brings the Account loader, so this shared layer stays free of features.
 */
export function useAfterRecordChange<Entry, Account>({
  listPath,
  announce,
  loadAccounts,
  notice,
}: {
  listPath: string
  announce: () => void
  loadAccounts: (entry: Entry) => Promise<Array<Account | undefined>>
  notice: (change: RecordChange, entry: Entry, accounts: Array<Account | undefined>) => string
}) {
  const navigate = useNavigate()
  return useCallback(
    async (change: RecordChange, entry: Entry) => {
      const accounts = await loadAccounts(entry)
      announce()
      const state: ScreenNotice = { notice: notice(change, entry, accounts) }
      navigate(listPath, { state })
    },
    [navigate, listPath, announce, loadAccounts, notice],
  )
}
