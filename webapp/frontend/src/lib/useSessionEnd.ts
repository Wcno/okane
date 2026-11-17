import { useCallback } from 'react'
import { useAuth } from '../auth/context'
import { SessionEndedError } from './http'

/**
 * Sends a User whose session ended to sign in again. Returns true when the
 * error was that, so the caller has nothing left to show.
 */
export function useSessionEnd() {
  const { reload } = useAuth()
  return useCallback(
    (error: unknown) => {
      if (!(error instanceof SessionEndedError)) return false
      reload()
      return true
    },
    [reload],
  )
}
