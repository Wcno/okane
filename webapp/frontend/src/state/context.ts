import { createContext, useContext } from 'react'
import type { DemoState } from '../data/sample'

/** What the sample Panel still takes from a real Expense until Budgets exist (#9): amount and Category only. */
export interface SampleSpend {
  /** A decimal string, as the API returns it. */
  amount: string
  category: string
}

export interface DataStore {
  state: DemoState
  /** Last Category changed, used to highlight the affected row. */
  recentCategory: string | null
  /** Expense count for restarting the row highlight on each entry. */
  registrationCount: number
  /** Confirmation of the last entry and its effect. */
  notice: string | null
  /** TEMPORARY until #9: feeds the sample Budget spend and shows the notice. Sample Accounts are untouched. */
  registerSampleSpend: (spend: SampleSpend, notice: string) => void
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
