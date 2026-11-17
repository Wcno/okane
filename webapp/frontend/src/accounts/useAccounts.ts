import { useLoaded } from '../lib/useLoaded'
import { listAccounts } from './api'

export const useAccounts = () => useLoaded(listAccounts)
