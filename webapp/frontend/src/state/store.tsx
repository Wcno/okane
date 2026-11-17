import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { initialState } from '../data/sample'
import { recordSampleSpend } from '../data/sampleRemaining'
import { DataContext, type SampleSpend } from './context'

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  const [recentCategory, setRecentCategory] = useState<string | null>(null)
  const [registrationCount, setRegistrationCount] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const registerSampleSpend = useCallback((spend: SampleSpend, message: string) => {
    setState((previous) => recordSampleSpend(previous, spend.category, spend.amount))
    setRecentCategory(spend.category)
    setRegistrationCount((count) => count + 1)
    setNotice(message)
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])
  const openForm = useCallback(() => setIsFormOpen(true), [])
  const closeForm = useCallback(() => setIsFormOpen(false), [])

  const value = useMemo(
    () => ({
      state,
      recentCategory,
      registrationCount,
      notice,
      registerSampleSpend,
      dismissNotice,
      isFormOpen,
      openForm,
      closeForm,
    }),
    [
      state,
      recentCategory,
      registrationCount,
      notice,
      registerSampleSpend,
      dismissNotice,
      isFormOpen,
      openForm,
      closeForm,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
