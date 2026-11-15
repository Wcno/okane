import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { initialState, recordExpense } from '../data/sample'
import { DataContext, type NewExpense } from './context'

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  const [lastAccountId, setLastAccountId] = useState('checking')
  const [recentCategory, setRecentCategory] = useState<string | null>(null)
  const [registrationCount, setRegistrationCount] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const register = useCallback((expense: NewExpense, message: string) => {
    setState((previous) => recordExpense(previous, expense))
    setLastAccountId(expense.accountId)
    setRecentCategory(expense.category)
    setRegistrationCount((count) => count + 1)
    setNotice(message)
  }, [])

  const dismissNotice = useCallback(() => setNotice(null), [])
  const openForm = useCallback(() => setIsFormOpen(true), [])
  const closeForm = useCallback(() => setIsFormOpen(false), [])

  const value = useMemo(
    () => ({
      state,
      lastAccountId,
      recentCategory,
      registrationCount,
      notice,
      register,
      dismissNotice,
      isFormOpen,
      openForm,
      closeForm,
    }),
    [
      state,
      lastAccountId,
      recentCategory,
      registrationCount,
      notice,
      register,
      dismissNotice,
      isFormOpen,
      openForm,
      closeForm,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
