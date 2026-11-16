import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useSession } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { primaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'

type Progress = { status: 'asking' } | { status: 'closing' } | { status: 'closed' } | { status: 'failed'; message: string }

const secondaryButtonClassName =
  'inline-flex h-12 w-full items-center justify-center rounded-full border border-line-strong text-[1rem] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2'

/**
 * Asks before closing the session, so that merely opening /logout, for instance
 * from a link on another site, never signs anyone out.
 */
export function Logout() {
  const { signOut } = useAuth()
  const { user } = useSession()
  const [progress, setProgress] = useState<Progress>({ status: 'asking' })

  const close = () => {
    setProgress({ status: 'closing' })
    signOut().then(
      () => setProgress({ status: 'closed' }),
      (error: Error) => setProgress({ status: 'failed', message: error.message }),
    )
  }

  if (progress.status === 'closed') {
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
      title={progress.status === 'failed' ? 'No pudimos cerrar tu sesión' : '¿Cerrar tu sesión?'}
      intro={
        <>
          Sesión iniciada como <span className="font-medium text-ink">{user.email}</span>. Para volver a ver tus datos
          tendrás que iniciar sesión de nuevo.
        </>
      }
    >
      <div className="space-y-3">
        {progress.status === 'failed' && <FormAlert>{progress.message}</FormAlert>}
        <button type="button" onClick={close} disabled={isClosing} className={primaryButtonClassName}>
          {isClosing ? 'Cerrando sesión…' : progress.status === 'failed' ? 'Reintentar' : 'Cerrar sesión'}
        </button>
        <Link to="/dashboard" className={secondaryButtonClassName}>
          Volver al Panel
        </Link>
      </div>
    </AuthLayout>
  )
}
