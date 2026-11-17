import { usePagedFeed, type Page, type PagedFeed } from '../lib/usePagedFeed'
import { listExpenses, type Expense } from './api'
import { useExpenseRevision } from './revision'

export type ExpenseFeed = PagedFeed<Expense>

const fetchExpensePage = async (page: number): Promise<Page<Expense>> => {
  const { expenses, total, nextPage } = await listExpenses(page)
  return { items: expenses, total, nextPage }
}

/** The User's Expenses, newest first; loaded again when one changes elsewhere. */
export const useExpenseFeed = () => usePagedFeed(fetchExpensePage, useExpenseRevision())
