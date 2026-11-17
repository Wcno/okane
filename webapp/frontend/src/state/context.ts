import { createContext, useContext } from 'react'
import type { DemoState } from '../data/sample'

export interface DataStore {
  /** The sample figures the Panel still shows until its own ticket reads api-service. */
  state: DemoState
  /** Confirmation of the last entry and its effect. */
  notice: string | null
  /** Shows the confirmation of an entry made in the quick form. */
  announce: (notice: string) => void
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
