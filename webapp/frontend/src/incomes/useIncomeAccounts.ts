import { listAccounts } from '../accounts/api'
import { offeredAccounts } from '../accounts/presentation'
import { useLoaded } from '../lib/useLoaded'

/** The Accounts a new Income may name. */
export const useIncomeAccounts = () => useLoaded(async () => offeredAccounts(await listAccounts()))
