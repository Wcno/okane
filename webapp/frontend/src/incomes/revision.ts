import { createRevision } from '../lib/revision'

/** Tells the screens that list Incomes that one was registered, changed or deleted elsewhere. */
export const { announce: announceIncomeRevision, useRevision: useIncomeRevision } = createRevision()
