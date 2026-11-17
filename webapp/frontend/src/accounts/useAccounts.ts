import { useLoaded } from '../lib/useLoaded'
import { listAccounts } from './api'

/** Loads the User's Accounts for a screen; a failure can be retried. */
export const useAccounts = () => useLoaded(listAccounts)
