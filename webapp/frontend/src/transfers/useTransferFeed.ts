import { useRecordFeed } from '../lib/useRecordFeed'
import { listTransfers } from './api'
import { useTransferRevision } from './revision'

/** The User's Transfers, newest first; they load again when one changes elsewhere. */
export const useTransferFeed = () => useRecordFeed(listTransfers, useTransferRevision())
