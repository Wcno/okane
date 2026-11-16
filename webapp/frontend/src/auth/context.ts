import { createContext, useContext } from 'react'
import type { Session } from './api'

export type SessionState =
  | { status: 'loading' }
  | { status: 'unavailable'; message: string }
  | { status: 'ready'; session: Session }

export interface AuthStore {
  state: SessionState
  /** Asks webapp again who is signed in, for instance after a failed first load. */
  reload: () => void
  /** Adopts the session returned by a login or registration. */
  adopt: (session: Session) => void
  /** Closes the session in webapp; rejects with a message to show. */
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthStore | null>(null)

export function useAuth() {
  const store = useContext(AuthContext)
  if (!store) throw new Error('useAuth must be used within AuthProvider')
  return store
}

/** The session once it is known; screens inside SessionGate use it. */
export function useSession() {
  const { state } = useAuth()
  if (state.status !== 'ready') throw new Error('useSession must be used within SessionGate')
  return state.session
}

/** The signed-in User; screens inside RequireSession use it. */
export function useSignedInUser() {
  const { user, csrfToken } = useSession()
  if (!user) throw new Error('useSignedInUser must be used within RequireSession')
  return { user, csrfToken }
}
