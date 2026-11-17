import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../auth/context'
import type { Outcome } from './http'

/**
 * The submit state every form and confirmation shares: one write at a time,
 * a flag for the button, and a User whose session ended sent to sign in again.
 * `onSaved` runs on success while the button is still busy. Returns the
 * outcome, or null when a write was already running.
 */
export function useSubmission() {
  const { reload: reloadSession } = useAuth()
  const running = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(
    async <T, Field extends string>(
      write: () => Promise<Outcome<T, Field>>,
      onSaved?: (value: T) => void | Promise<void>,
    ): Promise<Outcome<T, Field> | null> => {
      if (running.current) return null
      running.current = true
      setIsSubmitting(true)
      try {
        const outcome = await write()
        if (outcome.ok) await onSaved?.(outcome.value)
        else if (outcome.sessionEnded) reloadSession()
        return outcome
      } finally {
        running.current = false
        setIsSubmitting(false)
      }
    },
    [reloadSession],
  )

  return { isSubmitting, submit }
}
