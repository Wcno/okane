import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { SessionEndedError, listAccounts, type Account, type Outcome } from './api'

export type AccountsState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready'; accounts: Account[] }

/** Loads the User's Accounts for a screen; a failure can be retried. */
export function useAccounts() {
  const { reload: reloadSession } = useAuth()
  const [state, setState] = useState<AccountsState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    listAccounts().then(
      (accounts) => current && setState({ status: 'ready', accounts }),
      (error: Error) => {
        if (!current) return
        // Asking webapp again sends a visitor without a session to /login.
        if (error instanceof SessionEndedError) reloadSession()
        else setState({ status: 'failed', message: error.message })
      },
    )
    return () => {
      current = false
    }
  }, [attempt, reloadSession])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  return { state, retry }
}

/** Runs a write and sends a User whose session ended to sign in again. */
export function useAccountWrite() {
  const { reload: reloadSession } = useAuth()
  return useCallback(
    async <T,>(write: () => Promise<Outcome<T>>): Promise<Outcome<T>> => {
      const outcome = await write()
      if (!outcome.ok && outcome.sessionEnded) reloadSession()
      return outcome
    },
    [reloadSession],
  )
}
