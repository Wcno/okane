import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { endSession, fetchSession, type Session } from './api'
import { AuthContext, type SessionState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    fetchSession().then(
      (session) => current && setState({ status: 'ready', session }),
      (error: Error) => current && setState({ status: 'unavailable', message: error.message }),
    )
    return () => {
      current = false
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  const adopt = useCallback((session: Session) => setState({ status: 'ready', session }), [])

  const signOut = useCallback(async () => {
    if (state.status !== 'ready') return
    await endSession(state.session.csrfToken)
    setState({ status: 'ready', session: { ...state.session, user: null } })
  }, [state])

  const value = useMemo(() => ({ state, reload, adopt, signOut }), [state, reload, adopt, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
