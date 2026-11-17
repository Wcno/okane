import { createRevision } from '../lib/revision'

/** Tells the screens that list Transacciones de inversión that one was changed or deleted elsewhere. */
export const { announce: announceTransactionRevision, useRevision: useTransactionRevision } = createRevision()
