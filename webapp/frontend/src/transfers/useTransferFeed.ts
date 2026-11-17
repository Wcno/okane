import { usePagedFeed } from '../lib/usePagedFeed'
import { listTransfers } from './api'

/** The User's Transfers, newest first. */
export const useTransferFeed = () => usePagedFeed(listTransfers)
