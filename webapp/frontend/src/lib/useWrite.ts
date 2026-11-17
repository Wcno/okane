import { useCallback } from 'react'
import { useAuth } from '../auth/context'
import type { Outcome } from './http'

/** Runs a write and sends a User whose session ended to sign in again. */
export function useWrite() {
  const { reload: reloadSession } = useAuth()
  return useCallback(
    async <T, Field extends string>(write: () => Promise<Outcome<T, Field>>): Promise<Outcome<T, Field>> => {
      const outcome = await write()
      if (!outcome.ok && outcome.sessionEnded) reloadSession()
      return outcome
    },
    [reloadSession],
  )
}
