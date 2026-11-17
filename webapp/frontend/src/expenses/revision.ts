import { createRevision } from '../lib/revision'

/** Tells the screens that list Expenses that one was registered, changed or deleted elsewhere. */
export const { announce: announceExpenseRevision, useRevision: useExpenseRevision } = createRevision()
