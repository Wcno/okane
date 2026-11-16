import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../auth/api'
import { useSession } from '../auth/context'
import { validateRecoveryEmail, type FormErrors } from '../auth/validation'
import { AuthLayout, AuthSwitch } from '../components/AuthLayout'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'

export function ForgotPassword() {
  const { csrfToken } = useSession()
  const emailField = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors<'email'>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const showErrors = (found: FormErrors<'email'>) => {
    setErrors(found)
    if (found.email) emailField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const found = validateRecoveryEmail(email)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    const outcome = await requestPasswordReset(email.trim(), csrfToken)
    setIsSubmitting(false)
    if (outcome.ok) setSentTo(email.trim())
    else showErrors(outcome.errors)
  }

  if (sentTo !== null) {
    return (
      <AuthLayout title="Revisa tu correo">
        <div className="space-y-5">
          {/* The same words for every email, so the screen never says who is registered. */}
          <p role="status">
            Si hay un usuario con el correo <span className="font-medium break-all">{sentTo}</span>, le enviamos un
            enlace para elegir una contraseña nueva. Sirve una sola vez y caduca pronto.
          </p>
          <p className="text-[0.95rem] text-ink-2">
            Si no llega en unos minutos, revisa la carpeta de correo no deseado o pide otro enlace.
          </p>
          <div className="space-y-3">
            <Link to="/login" className={primaryButtonClassName}>
              Volver a iniciar sesión
            </Link>
            <button type="button" onClick={() => setSentTo(null)} className={secondaryButtonClassName}>
              Pedir otro enlace
            </button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recuperar tu contraseña"
      intro="Escribe el correo de tu usuario y te enviaremos un enlace para elegir una contraseña nueva."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

        <TextField
          ref={emailField}
          id="email"
          label="Correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          errors={errors.email}
        />

        <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
          {isSubmitting ? 'Enviando enlace…' : 'Enviar enlace'}
        </button>
      </form>
      <AuthSwitch question="¿Recordaste tu contraseña?" to="/login" state={null}>
        Inicia sesión
      </AuthSwitch>
    </AuthLayout>
  )
}
