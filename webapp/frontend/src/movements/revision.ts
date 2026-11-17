import { createRevision } from '../lib/revision'

/** Tells the Movements view that a record of any kind was registered, changed or deleted elsewhere. */
export const { announce: announceMovementsRevision, useRevision: useMovementsRevision } = createRevision()
