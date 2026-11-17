import { createRevision } from '../lib/revision'

/** Tells the screens that list Transfers that one was registered, changed or deleted elsewhere. */
export const { announce: announceTransferRevision, useRevision: useTransferRevision } = createRevision()
