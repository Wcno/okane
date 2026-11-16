export type CredentialsMode = 'login' | 'register'

export interface Credentials {
  email: string
  password: string
}

export interface PasswordChange {
  currentPassword: string
  newPassword: string
}

/** Messages per field of a form, plus the ones about the form as a whole. */
export type FormErrors<Field extends string> = Partial<Record<Field | 'form', string[]>>

export type CredentialErrors = FormErrors<keyof Credentials>

/** Matches docs/contratos.md; the server applies Django's full password validators. */
export const MIN_PASSWORD_LENGTH = 10

export const NEW_PASSWORD_HINT = `Al menos ${MIN_PASSWORD_LENGTH} caracteres. Evita contraseñas comunes o hechas solo de números.`

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function emailErrors(email: string): string[] | undefined {
  return EMAIL.test(email.trim()) ? undefined : ['Escribe tu correo completo, por ejemplo ana@ejemplo.com.']
}

function lengthErrors(password: string): string[] | undefined {
  const missing = MIN_PASSWORD_LENGTH - password.length
  if (missing <= 0) return undefined
  return [
    `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres. Te ${missing === 1 ? 'falta 1' : `faltan ${missing}`}.`,
  ]
}

function newPasswordErrors(password: string): string[] | undefined {
  return password === '' ? ['Escribe tu contraseña nueva.'] : lengthErrors(password)
}

/** Drops the fields that have nothing to say. */
function found<Field extends string>(errors: Record<Field, string[] | undefined>): FormErrors<Field> {
  return Object.fromEntries(Object.entries(errors).filter(([, messages]) => messages)) as FormErrors<Field>
}

// These check what the browser can know before sending; the server has the last word.

export function validateCredentials(mode: CredentialsMode, { email, password }: Credentials): CredentialErrors {
  return found({
    email: emailErrors(email),
    password:
      password === ''
        ? ['Escribe la contraseña de tu usuario.']
        : mode === 'register'
          ? lengthErrors(password)
          : undefined,
  })
}

export function validateRecoveryEmail(email: string): FormErrors<'email'> {
  return found({ email: emailErrors(email) })
}

export function validateNewPassword(password: string): FormErrors<'password'> {
  return found({ password: newPasswordErrors(password) })
}

export function validatePasswordChange({ currentPassword, newPassword }: PasswordChange): FormErrors<keyof PasswordChange> {
  return found({
    currentPassword: currentPassword === '' ? ['Escribe tu contraseña actual.'] : undefined,
    newPassword: newPasswordErrors(newPassword),
  })
}
