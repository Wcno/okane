import { useRef, useState, type FormEvent } from 'react'
import { submitCredentials } from '../auth/api'
import { useAuth, useSession } from '../auth/context'
import { NEW_PASSWORD_HINT, validateCredentials, type CredentialErrors, type CredentialsMode } from '../auth/validation'
import { primaryButtonClassName } from './buttons'
import { FormAlert } from './FormAlert'
import { TextField } from './TextField'

const SUBMIT_LABEL: Record<CredentialsMode, { idle: string; busy: string }> = {
  login: { idle: 'Iniciar sesión', busy: 'Iniciando sesión…' },
  register: { idle: 'Crear usuario', busy: 'Creando usuario…' },
}

export function CredentialsForm({ mode }: { mode: CredentialsMode }) {
  const { adopt } = useAuth()
  const { csrfToken } = useSession()
  const emailField = useRef<HTMLInputElement>(null)
  const passwordField = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<CredentialErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showErrors = (found: CredentialErrors) => {
    setErrors(found)
    if (found.email) emailField.current?.focus()
    else if (found.password) passwordField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const found = validateCredentials(mode, { email, password })
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    const outcome = await submitCredentials(mode, { email: email.trim(), password }, csrfToken)
    setIsSubmitting(false)
    // On success the guest-only route sends the User on to the screen they wanted.
    if (outcome.ok) adopt(outcome.session)
    else showErrors(outcome.errors)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

      <TextField
        ref={emailField}
        id="email"
        label="Correo"
        type="email"
        inputMode="email"
        autoComplete={mode === 'login' ? 'username' : 'email'}
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        errors={errors.email}
      />

      <TextField
        ref={passwordField}
        id="password"
        label="Contraseña"
        type="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        hint={mode === 'register' ? NEW_PASSWORD_HINT : undefined}
        errors={errors.password}
      />

      <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
        {isSubmitting ? SUBMIT_LABEL[mode].busy : SUBMIT_LABEL[mode].idle}
      </button>
    </form>
  )
}
