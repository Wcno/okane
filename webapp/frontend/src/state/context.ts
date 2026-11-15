import { createContext, useContext } from 'react'
import type { DemoState } from '../data/sample'

export interface NewExpense {
  amount: number
  category: string
  accountId: string
}

export interface DataStore {
  state: DemoState
  /** Default Account for the next Expense. */
  lastAccountId: string
  /** Last Category changed, used to highlight the affected row. */
  recentCategory: string | null
  /** Expense count for restarting the row highlight on each entry. */
  registrationCount: number
  /** Confirmation of the last entry and its effect. */
  notice: string | null
  register: (expense: NewExpense, notice: string) => void
  dismissNotice: () => void
  isFormOpen: boolean
  openForm: () => void
  closeForm: () => void
}

export const DataContext = createContext<DataStore | null>(null)

export function useData() {
  const store = useContext(DataContext)
  if (!store) throw new Error('useData must be used within DataProvider')
  return store
}
