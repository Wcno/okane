/** What every screen that talks to api-service through webapp shares. */

export const CONNECTION_LOST = 'No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'
export const WRITE_FAILED = 'Okane no pudo guardar el cambio. Espera un momento e inténtalo de nuevo.'
export const GONE = 'Este registro ya no existe. Vuelve a la lista para verla al día.'
export const SESSION_ENDED = 'Tu sesión terminó. Inicia sesión de nuevo para continuar.'

/** webapp answered that nobody is signed in. */
export class SessionEndedError extends Error {}

/** A read failed; its message is ready to show. */
export class RequestError extends Error {}

/** The record asked for is not the User's, or no longer exists. */
export class NotFoundError extends RequestError {}

/** Messages by form field; `form` holds what belongs to no single field. */
export type FieldErrors<Field extends string> = { [Name in Field]?: string[] } & { form?: string[] }

export type Outcome<T, Field extends string> =
  | { ok: true; value: T }
  /** sessionEnded: webapp no longer knows the User; the screen asks to sign in again. */
  | { ok: false; errors: FieldErrors<Field>; sessionEnded: boolean }

/** Reads JSON from webapp; a failure throws an error whose message can be shown. */
export async function readJson<Body>(path: string, failure: { failed: string; gone?: string }): Promise<Body> {
  let response: Response
  try {
    response = await fetch(path, { headers: { Accept: 'application/json' } })
  } catch {
    throw new RequestError(CONNECTION_LOST)
  }
  if (response.status === 401) throw new SessionEndedError(SESSION_ENDED)
  if (response.status === 404 && failure.gone) throw new NotFoundError(failure.gone)
  if (!response.ok) throw new RequestError(failure.failed)
  return response.json()
}

async function readErrors<Field extends string>(
  response: Response,
  fields: Record<string, Field>,
  gone: string,
): Promise<FieldErrors<Field>> {
  if (response.status === 401) return { form: [SESSION_ENDED] }
  if (response.status === 404) return { form: [gone] }
  try {
    const body = await response.json()
    if (body && typeof body.errors === 'object') {
      const errors: FieldErrors<Field> = {}
      for (const [field, messages] of Object.entries(body.errors as Record<string, string[]>)) {
        const name: Field | 'form' = fields[field] ?? 'form'
        errors[name] = [...(errors[name] ?? []), ...messages] as FieldErrors<Field>[typeof name]
      }
      return errors
    }
  } catch {
    // A proxy or crash page is not JSON; fall through to the generic message.
  }
  return { form: [WRITE_FAILED] }
}

export interface WriteRequest<T, Field extends string> {
  method: 'POST' | 'PUT' | 'DELETE'
  path: string
  csrfToken: string
  body?: unknown
  /** Maps the field names of api-service to the ones the form uses; a write without a form has none. */
  fields?: Record<string, Field>
  /** What to say when the record is gone. */
  gone?: string
  read: (response: Response) => Promise<T>
}

/** Sends a change with the CSRF token; field errors come back keyed by the form's fields. */
export async function write<T, Field extends string>(request: WriteRequest<T, Field>): Promise<Outcome<T, Field>> {
  let response: Response
  try {
    response = await fetch(request.path, {
      method: request.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': request.csrfToken,
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    })
  } catch {
    return { ok: false, sessionEnded: false, errors: { form: [CONNECTION_LOST] } }
  }
  if (response.ok) return { ok: true, value: await request.read(response) }
  return {
    ok: false,
    sessionEnded: response.status === 401,
    errors: await readErrors(response, request.fields ?? {}, request.gone ?? GONE),
  }
}
