import { write, type Outcome } from '../lib/http'
import type { Credentials, CredentialsMode, FormErrors, PasswordChange } from './validation'

export interface SessionUser {
  id: number
  email: string
}

export interface Session {
  user: SessionUser | null
  /** The CSRF cookie is HttpOnly; every write sends this token in X-CSRFToken. */
  csrfToken: string
}

type Rejected<Field extends string> = { ok: false; errors: FormErrors<Field> }

/** A write that answers with the session it leaves behind. */
export type SessionOutcome<Field extends string> = { ok: true; session: Session } | Rejected<Field>

export type CredentialsOutcome = SessionOutcome<keyof Credentials>

const CONNECTION_LOST = 'No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'
const SERVER_FAILED = 'Okane no pudo responder. Espera un momento e inténtalo de nuevo.'
const SESSION_ENDED = 'Tu sesión se cerró. Inicia sesión de nuevo para cambiar tu contraseña.'

interface SessionBody {
  user: SessionUser | null
  csrf_token: string
}

const toSession = (body: SessionBody): Session => ({ user: body.user, csrfToken: body.csrf_token })

/** An auth call that did not complete; its message is ready to show. */
export class AuthRequestError extends Error {}

const CREDENTIALS_PATH: Record<CredentialsMode, string> = {
  login: '/auth/login',
  register: '/auth/register',
}

export async function fetchSession(): Promise<Session> {
  let response: Response
  try {
    response = await fetch('/auth/session', { headers: { Accept: 'application/json' } })
  } catch {
    throw new AuthRequestError(CONNECTION_LOST)
  }
  if (!response.ok) throw new AuthRequestError(SERVER_FAILED)
  return toSession(await response.json())
}

function sendJson(method: 'POST' | 'PUT', path: string, csrfToken: string, body?: unknown) {
  return fetch(path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function readErrors(response: Response): Promise<FormErrors<string>> {
  try {
    const body = await response.json()
    if (body && typeof body.errors === 'object') return body.errors
  } catch {
    // A proxy or crash page is not JSON; fall through to the generic message.
  }
  return { form: [SERVER_FAILED] }
}

/** Sends a form; resolves with the accepted response or with the errors to show. */
async function submit<Field extends string>(
  method: 'POST' | 'PUT',
  path: string,
  csrfToken: string,
  body: unknown,
): Promise<{ ok: true; response: Response } | Rejected<Field>> {
  let response: Response
  try {
    response = await sendJson(method, path, csrfToken, body)
  } catch {
    return { ok: false, errors: { form: [CONNECTION_LOST] } as FormErrors<Field> }
  }
  if (response.ok) return { ok: true, response }
  return { ok: false, errors: (await readErrors(response)) as FormErrors<Field> }
}

async function withSession<Field extends string>(
  outcome: { ok: true; response: Response } | Rejected<Field>,
): Promise<SessionOutcome<Field>> {
  return outcome.ok ? { ok: true, session: toSession(await outcome.response.json()) } : outcome
}

export async function submitCredentials(
  mode: CredentialsMode,
  credentials: Credentials,
  csrfToken: string,
): Promise<CredentialsOutcome> {
  return withSession(await submit<keyof Credentials>('POST', CREDENTIALS_PATH[mode], csrfToken, credentials))
}

/** Asks for a reset link; webapp answers the same whether or not the email has a User. */
export async function requestPasswordReset(
  email: string,
  csrfToken: string,
): Promise<{ ok: true } | Rejected<'email'>> {
  const outcome = await submit<'email'>('POST', '/auth/forgot-password', csrfToken, { email })
  return outcome.ok ? { ok: true } : outcome
}

/** Sets a new password with the token of a mailed link; the session it returns has no User. */
export async function resetPassword(
  token: string,
  password: string,
  csrfToken: string,
): Promise<SessionOutcome<'password'>> {
  return withSession(await submit<'password'>('POST', '/auth/reset-password', csrfToken, { token, password }))
}

export async function changePassword(
  { currentPassword, newPassword }: PasswordChange,
  csrfToken: string,
): Promise<SessionOutcome<keyof PasswordChange>> {
  let response: Response
  try {
    response = await sendJson('PUT', '/auth/password', csrfToken, {
      current_password: currentPassword,
      new_password: newPassword,
    })
  } catch {
    return { ok: false, errors: { form: [CONNECTION_LOST] } }
  }
  if (response.ok) return { ok: true, session: toSession(await response.json()) }
  if (response.status === 401) return { ok: false, errors: { form: [SESSION_ENDED] } }
  const { current_password, new_password, form } = await readErrors(response)
  const errors: FormErrors<keyof PasswordChange> = {}
  if (current_password) errors.currentPassword = current_password
  if (new_password) errors.newPassword = new_password
  if (form) errors.form = form
  return { ok: false, errors }
}

/** Resolves once the session is closed; rejects with a message to show. */
export async function endSession(csrfToken: string): Promise<void> {
  let response: Response
  try {
    response = await sendJson('POST', '/auth/logout', csrfToken)
  } catch {
    throw new AuthRequestError(CONNECTION_LOST)
  }
  if (!response.ok) {
    const errors = await readErrors(response)
    throw new AuthRequestError(errors.form?.[0] ?? SERVER_FAILED)
  }
}

const API_SERVICE_DOWN =
  'No pudimos borrar tus datos porque el servicio financiero no responde. No se eliminó nada: inténtalo de nuevo en un momento.'

/** Deletes the User and their financial data; webapp keeps the User unless api-service confirms. */
export function deleteUser(password: string, csrfToken: string): Promise<Outcome<void, 'password'>> {
  return write({
    method: 'DELETE',
    path: '/users/me',
    csrfToken,
    body: { password },
    fields: { password: 'password' },
    unavailable: API_SERVICE_DOWN,
    read: async () => undefined,
  })
}
