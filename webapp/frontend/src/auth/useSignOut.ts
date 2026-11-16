import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './context'

export type SignOutProgress = { status: 'idle' } | { status: 'closing' } | { status: 'failed'; message: string }

/** Router state that tells /logout to show its closed state instead of asking. */
export const SIGNED_OUT = { signedOut: true }

export const isSignedOutState = (state: unknown) => (state as typeof SIGNED_OUT | null)?.signedOut === true

/**
 * The one sign-out action of the app: the sidebar, Menú and the /logout screen
 * all use it. It closes the session in webapp and opens the closed state of /logout.
 */
export function useSignOut() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [progress, setProgress] = useState<SignOutProgress>({ status: 'idle' })

  const signOutNow = useCallback(async () => {
    setProgress({ status: 'closing' })
    try {
      await signOut(() => navigate('/logout', { replace: true, state: SIGNED_OUT }))
    } catch (error) {
      setProgress({
        status: 'failed',
        message: `No pudimos cerrar tu sesión. ${(error as Error).message}`,
      })
    }
  }, [signOut, navigate])

  return { progress, signOutNow }
}
