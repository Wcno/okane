import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/context'
import { AuthLayout } from '../components/AuthLayout'
import { FormAlert } from '../components/FormAlert'

type Progress = { status: 'closing' } | { status: 'closed' } | { status: 'failed'; message: string }

const buttonClassName =
  'inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-[1rem] font-semibold text-on-primary transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]'

/** Opening /logout closes the session at once; the screen confirms it. */
export function Logout() {
  const { signOut } = useAuth()
  const [progress, setProgress] = useState<Progress>({ status: 'closing' })
  const started = useRef(false)

  const close = useCallback(() => {
    setProgress({ status: 'closing' })
    signOut().then(
      () => setProgress({ status: 'closed' }),
      (error: Error) => setProgress({ status: 'failed', message: error.message }),
    )
  }, [signOut])

  useEffect(() => {
    // Closes once on arrival; StrictMode and a new signOut must not repeat it.
    if (started.current) return
    started.current = true
    close()
  }, [close])

  if (progress.status === 'failed') {
    return (
      <AuthLayout title="No pudimos cerrar tu sesión">
        <FormAlert>{progress.message}</FormAlert>
        <button type="button" onClick={close} className={`${buttonClassName} mt-5`}>
          Reintentar
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={progress.status === 'closed' ? 'Cerraste tu sesión' : 'Cerrando tu sesión…'}
      intro={
        progress.status === 'closed'
          ? 'Nadie puede ver tus datos desde este dispositivo sin volver a iniciar sesión.'
          : undefined
      }
    >
      <p role="status" className="sr-only">
        {progress.status === 'closed' ? 'Sesión cerrada.' : 'Cerrando sesión.'}
      </p>
      {progress.status === 'closed' && (
        <Link to="/login" className={buttonClassName}>
          Iniciar sesión de nuevo
        </Link>
      )}
    </AuthLayout>
  )
}
