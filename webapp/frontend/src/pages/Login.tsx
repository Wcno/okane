import { useLocation } from 'react-router-dom'
import { AuthLayout, AuthSwitch } from '../components/AuthLayout'
import { CredentialsForm } from '../components/CredentialsForm'

export function Login() {
  const location = useLocation()
  return (
    <AuthLayout title="Iniciar sesión" intro="Entra con el correo y la contraseña de tu usuario.">
      <CredentialsForm form="login" />
      <AuthSwitch question="¿Todavía no tienes usuario?" to="/register" state={location.state}>
        Regístrate
      </AuthSwitch>
    </AuthLayout>
  )
}
