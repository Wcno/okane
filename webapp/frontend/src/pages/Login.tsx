import { Link, useLocation } from 'react-router-dom'
import { isPasswordResetState } from '../auth/redirect'
import { AuthLayout, AuthSwitch } from '../components/AuthLayout'
import { CredentialsForm } from '../components/CredentialsForm'
import { FormNotice } from '../components/FormAlert'

export function Login() {
  const location = useLocation()
  return (
    <AuthLayout title="Iniciar sesión" intro="Entra con el correo y la contraseña de tu usuario.">
      {isPasswordResetState(location.state) && (
        <div className="mb-5">
          <FormNotice>Tu contraseña se cambió. Inicia sesión con la nueva.</FormNotice>
        </div>
      )}
      <CredentialsForm mode="login" />
      <p className="mt-5 text-[0.95rem]">
        <Link
          to="/forgot-password"
          className="font-semibold text-ink underline decoration-line-strong hover:decoration-ink"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <AuthSwitch question="¿Todavía no tienes usuario?" to="/register" state={location.state}>
        Regístrate
      </AuthSwitch>
    </AuthLayout>
  )
}
