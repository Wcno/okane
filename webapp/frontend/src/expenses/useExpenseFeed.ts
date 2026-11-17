import { usePagedFeed, type Page } from '../lib/usePagedFeed'
import { listExpenses, type Expense } from './api'
import { useExpenseRevision } from './revision'

const loadExpensePage = async (page: number): Promise<Page<Expense>> => {
  const { expenses, total, nextPage } = await listExpenses(page)
  return { items: expenses, total, nextPage }
}

/** The User's Expenses, newest first; reloads when an Expense changes elsewhere. */
export function useExpenseFeed() {
  return usePagedFeed(loadExpensePage, useExpenseRevision())
}
