import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DataContext } from './context'

export function DataProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const announce = useCallback((message: string) => setNotice(message), [])
  const dismissNotice = useCallback(() => setNotice(null), [])
  const openForm = useCallback(() => setIsFormOpen(true), [])
  const closeForm = useCallback(() => setIsFormOpen(false), [])

  const value = useMemo(
    () => ({ notice, announce, dismissNotice, isFormOpen, openForm, closeForm }),
    [notice, announce, dismissNotice, isFormOpen, openForm, closeForm],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
