import { useRef, useState, type FormEvent } from 'react'
import { changePassword } from '../auth/api'
import { useAuth, useSignedInUser } from '../auth/context'
import { NEW_PASSWORD_HINT, validatePasswordChange, type FormErrors, type PasswordChange } from '../auth/validation'
import { primaryButtonClassName } from '../components/buttons'
import { FormAlert, FormNotice } from '../components/FormAlert'
import { TextField } from '../components/TextField'

type ChangeErrors = FormErrors<keyof PasswordChange>

export function ChangePassword() {
  const { adopt } = useAuth()
  const { user, csrfToken } = useSignedInUser()
  const currentField = useRef<HTMLInputElement>(null)
  const newField = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [errors, setErrors] = useState<ChangeErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChanged, setIsChanged] = useState(false)

  const showErrors = (found: ChangeErrors) => {
    setErrors(found)
    if (found.currentPassword) currentField.current?.focus()
    else if (found.newPassword) newField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    setIsChanged(false)
    const found = validatePasswordChange({ currentPassword, newPassword })
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    const outcome = await changePassword({ currentPassword, newPassword }, csrfToken)
    setIsSubmitting(false)
    if (!outcome.ok) {
      showErrors(outcome.errors)
      return
    }
    adopt(outcome.session)
    setCurrentPassword('')
    setNewPassword('')
    setIsChanged(true)
  }

  return (
    <>
      <header className="mb-5 lg:mb-7 lg:pr-48">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">
          Cambiar contraseña
        </h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">
          Al cambiarla seguirás con la sesión abierta aquí y se cerrarán las que tengas en otros dispositivos.
        </p>
      </header>

      <section className="max-w-[28rem] rounded-card border border-line bg-surface p-5 shadow-card lg:p-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}
          {isChanged && <FormNotice>Tu contraseña se cambió. Cerramos tus otras sesiones.</FormNotice>}

          {/* Tells password managers which user these passwords belong to. */}
          <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />

          <TextField
            ref={currentField}
            id="current-password"
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            errors={errors.currentPassword}
          />

          <TextField
            ref={newField}
            id="new-password"
            label="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            hint={NEW_PASSWORD_HINT}
            errors={errors.newPassword}
          />

          <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
            {isSubmitting ? 'Cambiando contraseña…' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </>
  )
}
