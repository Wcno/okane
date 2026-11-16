import { Link, useLocation } from 'react-router-dom'
import { useSession } from '../auth/context'
import { isSignedOutState, useSignOut } from '../auth/useSignOut'
import { AuthLayout } from '../components/AuthLayout'
import { primaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'

const secondaryButtonClassName =
  'inline-flex h-12 w-full items-center justify-center rounded-full border border-line-strong text-[1rem] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2'

/**
 * Opened by URL, it asks before closing the session, so a link from another
 * site never signs anyone out. The in-app controls sign out in one click and
 * land here in the closed state.
 */
export function Logout() {
  const { user } = useSession()
  const location = useLocation()
  const { progress, signOutNow } = useSignOut()

  if (!user && isSignedOutState(location.state)) {
    return (
      <AuthLayout
        title="Cerraste tu sesión"
        intro="Nadie puede ver tus datos desde este dispositivo sin volver a iniciar sesión."
      >
        <p role="status" className="sr-only">
          Sesión cerrada.
        </p>
        <Link to="/login" className={primaryButtonClassName}>
          Iniciar sesión de nuevo
        </Link>
      </AuthLayout>
    )
  }

  if (!user) {
    return (
      <AuthLayout title="No hay una sesión abierta" intro="Inicia sesión para ver tus finanzas.">
        <Link to="/login" className={primaryButtonClassName}>
          Iniciar sesión
        </Link>
      </AuthLayout>
    )
  }

  const isClosing = progress.status === 'closing'
  return (
    <AuthLayout
      title="¿Cerrar tu sesión?"
      intro={
        <>
          Sesión iniciada como <span className="font-medium text-ink">{user.email}</span>. Para volver a ver tus datos
          tendrás que iniciar sesión de nuevo.
        </>
      }
    >
      <div className="space-y-3">
        {progress.status === 'failed' && <FormAlert>{progress.message}</FormAlert>}
        <button type="button" onClick={signOutNow} disabled={isClosing} className={primaryButtonClassName}>
          {isClosing ? 'Cerrando sesión…' : progress.status === 'failed' ? 'Reintentar' : 'Cerrar sesión'}
        </button>
        <Link to="/dashboard" className={secondaryButtonClassName}>
          Volver al Panel
        </Link>
      </div>
    </AuthLayout>
  )
}
