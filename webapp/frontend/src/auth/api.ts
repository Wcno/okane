import type { CredentialErrors, Credentials, CredentialsForm } from './validation'

export interface SessionUser {
  id: number
  email: string
}

export interface Session {
  user: SessionUser | null
  /** The CSRF cookie is HttpOnly; every write sends this token in X-CSRFToken. */
  csrfToken: string
}

export type CredentialsOutcome = { ok: true; session: Session } | { ok: false; errors: CredentialErrors }

const CONNECTION_LOST = 'No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'
const SERVER_FAILED = 'Okane no pudo responder. Espera un momento e inténtalo de nuevo.'

interface SessionBody {
  user: SessionUser | null
  csrf_token: string
}

const toSession = (body: SessionBody): Session => ({ user: body.user, csrfToken: body.csrf_token })

export class SessionUnavailableError extends Error {}

export async function fetchSession(): Promise<Session> {
  let response: Response
  try {
    response = await fetch('/auth/session', { headers: { Accept: 'application/json' } })
  } catch {
    throw new SessionUnavailableError(CONNECTION_LOST)
  }
  if (!response.ok) throw new SessionUnavailableError(SERVER_FAILED)
  return toSession(await response.json())
}

function post(path: string, csrfToken: string, body?: unknown) {
  return fetch(path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function readErrors(response: Response): Promise<CredentialErrors> {
  try {
    const body = await response.json()
    if (body && typeof body.errors === 'object') return body.errors
  } catch {
    // A proxy or crash page is not JSON; fall through to the generic message.
  }
  return { form: [SERVER_FAILED] }
}

export async function submitCredentials(
  form: CredentialsForm,
  credentials: Credentials,
  csrfToken: string,
): Promise<CredentialsOutcome> {
  let response: Response
  try {
    response = await post(`/auth/${form}`, csrfToken, credentials)
  } catch {
    return { ok: false, errors: { form: [CONNECTION_LOST] } }
  }
  if (response.ok) return { ok: true, session: toSession(await response.json()) }
  return { ok: false, errors: await readErrors(response) }
}

/** Resolves once the session is closed; rejects with a message to show. */
export async function endSession(csrfToken: string): Promise<void> {
  let response: Response
  try {
    response = await post('/auth/logout', csrfToken)
  } catch {
    throw new SessionUnavailableError(CONNECTION_LOST)
  }
  if (!response.ok) {
    const errors = await readErrors(response)
    throw new SessionUnavailableError(errors.form?.[0] ?? SERVER_FAILED)
  }
}
