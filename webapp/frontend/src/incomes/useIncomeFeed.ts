import { useRecordFeed } from '../lib/useRecordFeed'
import { listIncomes } from './api'
import { useIncomeRevision } from './revision'

/** The User's Incomes, newest first; they load again when one changes elsewhere. */
export const useIncomeFeed = () => useRecordFeed(listIncomes, useIncomeRevision())
