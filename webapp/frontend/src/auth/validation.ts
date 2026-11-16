export type CredentialsMode = 'login' | 'register'

export interface Credentials {
  email: string
  password: string
}

export type CredentialErrors = Partial<Record<keyof Credentials | 'form', string[]>>

/** Matches docs/contratos.md; the server applies Django's full password validators. */
export const MIN_PASSWORD_LENGTH = 10

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Checks what the browser can know before sending; the server has the last word. */
export function validateCredentials(mode: CredentialsMode, { email, password }: Credentials): CredentialErrors {
  const errors: CredentialErrors = {}
  if (!EMAIL.test(email.trim())) {
    errors.email = ['Escribe tu correo completo, por ejemplo ana@ejemplo.com.']
  }
  if (password === '') {
    errors.password = ['Escribe la contraseña de tu usuario.']
  } else if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
    const missing = MIN_PASSWORD_LENGTH - password.length
    errors.password = [
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres. Te ${missing === 1 ? 'falta 1' : `faltan ${missing}`}.`,
    ]
  }
  return errors
}
