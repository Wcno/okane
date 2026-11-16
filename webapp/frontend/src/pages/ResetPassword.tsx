import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { resetPassword } from '../auth/api'
import { useAuth, useSession } from '../auth/context'
import { PASSWORD_RESET } from '../auth/redirect'
import { NEW_PASSWORD_HINT, validateNewPassword, type FormErrors } from '../auth/validation'
import { AuthLayout, AuthSwitch } from '../components/AuthLayout'
import { primaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { TextField } from '../components/TextField'

/** Opened from the mailed link; the token in the address proves who asked. */
export function ResetPassword() {
  const { token = '' } = useParams()
  const { adopt } = useAuth()
  const { csrfToken } = useSession()
  const navigate = useNavigate()
  const passwordField = useRef<HTMLInputElement>(null)

  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors<'password'>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showErrors = (found: FormErrors<'password'>) => {
    setErrors(found)
    if (found.password) passwordField.current?.focus()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmitting) return
    const found = validateNewPassword(password)
    if (Object.keys(found).length > 0) {
      showErrors(found)
      return
    }
    setErrors({})
    setIsSubmitting(true)
    const outcome = await resetPassword(token, password, csrfToken)
    setIsSubmitting(false)
    if (!outcome.ok) {
      showErrors(outcome.errors)
      return
    }
    // Every earlier session ended with the old password, this browser's included.
    adopt(outcome.session)
    navigate('/login', { replace: true, state: PASSWORD_RESET })
  }

  return (
    <AuthLayout
      title="Elegir una contraseña nueva"
      intro="Al guardarla se cerrarán las sesiones que tengas abiertas en otros dispositivos."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

        <TextField
          ref={passwordField}
          id="password"
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={NEW_PASSWORD_HINT}
          errors={errors.password}
        />

        <button type="submit" disabled={isSubmitting} className={primaryButtonClassName}>
          {isSubmitting ? 'Guardando contraseña…' : 'Guardar contraseña'}
        </button>
      </form>
      <AuthSwitch question="¿El enlace ya no sirve?" to="/forgot-password" state={null}>
        Pide uno nuevo
      </AuthSwitch>
    </AuthLayout>
  )
}
