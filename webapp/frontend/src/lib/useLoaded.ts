import { useCallback, useEffect, useRef, useState } from 'react'
import { NotFoundError } from './http'
import { useSessionEnd } from './useSessionEnd'

export type Loaded<T> =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  /** The record asked for is not the User's, or no longer exists. */
  | { status: 'gone'; message: string }
  | { status: 'ready'; value: T }

/**
 * Loads data for a screen, and again whenever `reloadOn` changes (the id of the
 * record on screen, a counter that says something changed elsewhere). A failure
 * can be retried. A User whose session ended is sent to sign in again.
 */
export function useLoaded<T>(load: () => Promise<T>, reloadOn?: unknown) {
  const endSession = useSessionEnd()
  const [state, setState] = useState<Loaded<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const latestLoad = useRef(load)
  useEffect(() => {
    latestLoad.current = load
  })

  useEffect(() => {
    let current = true
    latestLoad.current().then(
      (value) => current && setState({ status: 'ready', value }),
      (error: Error) => {
        if (!current) return
        if (endSession(error)) return
        if (error instanceof NotFoundError) setState({ status: 'gone', message: error.message })
        else setState({ status: 'failed', message: error.message })
      },
    )
    return () => {
      current = false
    }
  }, [reloadOn, attempt, endSession])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((count) => count + 1)
  }, [])

  return { state, retry }
}
