import type { RecordPage } from '../lib/recordPage'
import { useRecordFeed } from '../lib/useRecordFeed'
import { listExpenses, type Expense } from './api'
import { useExpenseRevision } from './revision'

async function loadExpenses(page: number): Promise<RecordPage<Expense>> {
  const { expenses, total, nextPage } = await listExpenses(page)
  return { records: expenses, total, nextPage }
}

/** The User's Expenses, newest first; they load again when one changes elsewhere. */
export const useExpenseFeed = () => useRecordFeed(loadExpenses, useExpenseRevision())
