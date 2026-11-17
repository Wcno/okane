import { listAccounts } from '../accounts/api'
import { useLoaded } from '../lib/useLoaded'
import { lastUsedAccountId } from './api'
import { offeredAccounts } from './presentation'

export function useExpenseAccounts() {
  return useLoaded(async () => {
    const [accounts, lastUsed] = await Promise.all([listAccounts(), lastUsedAccountId()])
    return { accounts: offeredAccounts(accounts), lastUsed }
  })
}
