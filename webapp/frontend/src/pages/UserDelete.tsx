import { UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteUser } from '../auth/api'
import { useAuth, useSignedInUser } from '../auth/context'
import { USER_DELETED } from '../auth/useSignOut'
import { TextField } from '../components/TextField'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { useFieldErrors } from '../lib/fieldErrors'
import type { Outcome } from '../lib/http'

const PASSWORD_REQUIRED = 'Escribe tu contraseña para confirmar.'

/** Delete user: asks for the password again, because nothing brings the User back. */
export function UserDelete() {
  const { user, csrfToken } = useSignedInUser()
  const { reload } = useAuth()
  const navigate = useNavigate()
  const passwordField = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const { errors, setErrors, clearErrors } = useFieldErrors<'password'>()

  const run = async (): Promise<Outcome<void, 'password'>> => {
    if (password === '') return { ok: false, sessionEnded: false, errors: { password: [PASSWORD_REQUIRED] } }
    return deleteUser(password, csrfToken)
  }

  return (
    <>
      <ScreenHeader title="Eliminar usuario" back={{ to: '/menu', label: 'Secciones' }} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-ink-2">
                <UserRound size={20} aria-hidden="true" />
              </span>
            }
            title={user.email}
            details="Tu usuario"
          />
        }
        message="Se borrarán tu usuario y todos tus datos financieros: Cuentas, Gastos y lo que hayas registrado. No se puede deshacer. Tu correo quedará libre para registrarte de nuevo."
        cancel={{ to: '/dashboard', label: 'Cancelar' }}
        confirm={{
          label: 'Eliminar mi usuario',
          busyLabel: 'Eliminando…',
          run,
          onSaved: () => {
            navigate('/logout', { replace: true, state: USER_DELETED })
            reload()
          },
          failure: 'No pudimos eliminar tu usuario. No se borró nada; inténtalo de nuevo.',
          onRejected: (found) => {
            setErrors(found)
            if (found.password) passwordField.current?.focus()
          },
        }}
      >
        {/* Tells password managers which user this password belongs to. */}
        <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <TextField
          ref={passwordField}
          id="delete-password"
          label="Tu contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearErrors('password')
          }}
          errors={errors.password}
        />
      </ConfirmCard>
    </>
  )
}
