export const authRoutes = ['/login', '/register', '/logout']

/** Router state that tells /login a new password was just saved from a reset link. */
export const PASSWORD_RESET = { passwordReset: true }

export const isPasswordResetState = (state: unknown) => (state as typeof PASSWORD_RESET | null)?.passwordReset === true

const HOME = '/dashboard'

/**
 * Where to go once a session opens: the in-app screen saved in the router
 * state by RequireSession, or the Panel. Anything else could leave the app.
 */
export function afterSignIn(locationState: unknown): string {
  const from = (locationState as { from?: unknown } | null)?.from
  if (typeof from !== 'string' || !/^\/(?![/\\])/.test(from)) return HOME
  const pathname = from.split(/[?#]/)[0]
  return authRoutes.includes(pathname) ? HOME : from
}
