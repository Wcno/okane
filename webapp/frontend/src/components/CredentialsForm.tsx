import { useRef, useState, type FormEvent } from 'react'
import { submitCredentials } from '../auth/api'
import { useAuth, useSession } from '../auth/context'
import {
  MIN_PASSWORD_LENGTH,
  validateCredentials,
  type CredentialErrors,
  type CredentialsForm as Form,
} from '../auth/validation'
import { FormAlert } from './FormAlert'

const fieldClassName =
  'mt-1.5 h-11 w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

const SUBMIT_LABEL: Record<Form, { idle: string; busy: string }> = {
  login: { idle: 'Iniciar sesión', busy: 'Iniciando sesión…' },
  register: { idle: 'Crear cuenta', busy: 'Creando cuenta…' },
}

/** Email and password form shared by login and registration; opens the session on success. */
export function CredentialsForm({ form }: { form: Form }) {
  const { adopt } = useAuth()
  const { csrfToken } = useSession()
  const emailField = useRef<HTMLInputElement>(null)
  const passwordField = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<CredentialErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const focusFirstInvalid = (found: CredentialErrors) => {
    if (found.email) emailField.current?.focus()
    else if (found.password) passwordField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const found = validateCredentials(form, { email, password })
    setErrors(found)
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(found)
      return
    }
    setIsSubmitting(true)
    const outcome = await submitCredentials(form, { email: email.trim(), password }, csrfToken)
    setIsSubmitting(false)
    if (outcome.ok) {
      // The guest-only route sends the new User on to the screen they wanted.
      adopt(outcome.session)
      return
    }
    setErrors(outcome.errors)
    focusFirstInvalid(outcome.errors)
  }

  const passwordHint =
    form === 'register'
      ? `Al menos ${MIN_PASSWORD_LENGTH} caracteres. Evita contraseñas comunes o hechas solo de números.`
      : null
  const passwordDescribedBy =
    [passwordHint && 'password-hint', errors.password && 'password-error'].filter(Boolean).join(' ') || undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

      <div>
        <label htmlFor="email" className="text-[0.9rem] font-medium text-ink-2">
          Correo
        </label>
        <input
          ref={emailField}
          id="email"
          type="email"
          inputMode="email"
          autoComplete={form === 'login' ? 'username' : 'email'}
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`${fieldClassName} ${errors.email ? 'border-critical' : 'border-line-strong hover:border-ink-3'}`}
        />
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-[0.9rem] text-critical">
            {errors.email.join(' ')}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="text-[0.9rem] font-medium text-ink-2">
          Contraseña
        </label>
        <input
          ref={passwordField}
          id="password"
          type="password"
          autoComplete={form === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={passwordDescribedBy}
          className={`${fieldClassName} ${errors.password ? 'border-critical' : 'border-line-strong hover:border-ink-3'}`}
        />
        {passwordHint && (
          <p id="password-hint" className="mt-1.5 text-[0.87rem] text-ink-3">
            {passwordHint}
          </p>
        )}
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-[0.9rem] text-critical">
            {errors.password.join(' ')}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-full bg-primary text-[1rem] font-semibold text-on-primary transition-transform duration-150 hover:-translate-y-px active:scale-[0.98] disabled:translate-y-0 disabled:opacity-70"
      >
        {isSubmitting ? SUBMIT_LABEL[form].busy : SUBMIT_LABEL[form].idle}
      </button>
    </form>
  )
}
