import { useLocation } from 'react-router-dom'
import { AuthLayout, AuthSwitch } from '../components/AuthLayout'
import { CredentialsForm } from '../components/CredentialsForm'

export function Register() {
  const location = useLocation()
  return (
    <AuthLayout title="Crear tu usuario" intro="Con tu correo y una contraseña empiezas a llevar tus finanzas en Okane.">
      <CredentialsForm form="register" />
      <AuthSwitch question="¿Ya tienes usuario?" to="/login" state={location.state}>
        Inicia sesión
      </AuthSwitch>
    </AuthLayout>
  )
}
