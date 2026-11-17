import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAccounts, type Account } from '../accounts/api'
import type { ScreenNotice } from '../lib/notice'
import type { Transfer } from './api'
import { savedNotice, type TransferChange } from './notices'

const currentAccounts = async (): Promise<Account[]> => {
  try {
    return await listAccounts()
  } catch {
    return []
  }
}

/** What every change of a Transfer ends with: back to the list, with a notice that names both new Balances. */
export function useAfterTransferChange() {
  const navigate = useNavigate()
  return useCallback(
    async (change: TransferChange, transfer: Pick<Transfer, 'amount' | 'sourceAccountId' | 'destinationAccountId'>) => {
      const accounts = await currentAccounts()
      const find = (id: number) => accounts.find((account) => account.id === id)
      const state: ScreenNotice = {
        notice: savedNotice(change, transfer, find(transfer.sourceAccountId), find(transfer.destinationAccountId)),
      }
      navigate('/transfers', { state })
    },
    [navigate],
  )
}
