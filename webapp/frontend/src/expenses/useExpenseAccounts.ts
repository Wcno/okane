import { listAccounts } from '../accounts/api'
import { offeredAccounts } from '../accounts/presentation'
import { useLoaded } from '../lib/useLoaded'
import { lastUsedAccountId } from './api'

export function useExpenseAccounts() {
  return useLoaded(async () => {
    const [accounts, lastUsed] = await Promise.all([listAccounts(), lastUsedAccountId()])
    return { accounts: offeredAccounts(accounts), lastUsed }
  })
}
