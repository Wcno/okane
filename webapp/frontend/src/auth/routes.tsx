import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { FormAlert } from '../components/FormAlert'
import { useAuth } from './context'
import { afterSignIn } from './redirect'

/** Waits for webapp to say who is signed in; offers a retry if it cannot be reached. */
export function SessionGate() {
  const { state, reload } = useAuth()
  if (state.status === 'loading') return null
  if (state.status === 'unavailable') {
    return (
      <AuthLayout title="No pudimos abrir Okane">
        <FormAlert>{state.message}</FormAlert>
        <button
          type="button"
          onClick={reload}
          className="mt-5 h-12 w-full rounded-full bg-primary text-[1rem] font-semibold text-on-primary transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]"
        >
          Reintentar
        </button>
      </AuthLayout>
    )
  }
  return <Outlet />
}

/** Screens with financial data: a visitor is sent to /login and brought back after. */
export function RequireSession() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'ready' && state.session.user) return <Outlet />
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}

/** Login and registration: a signed-in User goes on to where they were heading. */
export function GuestOnly() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'ready' && state.session.user) return <Navigate to={afterSignIn(location.state)} replace />
  return <Outlet />
}
