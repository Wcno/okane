import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'

export type TokenScope = 'finance:read' | 'movements:create'

/** The permissions a token may be given, in display order (docs/contratos.md). */
export const TOKEN_SCOPES: { value: TokenScope; label: string; hint: string }[] = [
  { value: 'finance:read', label: 'Leer datos financieros', hint: 'Cuentas con su Saldo, Presupuestos y Movimientos.' },
  { value: 'movements:create', label: 'Crear Movimientos', hint: 'Registrar ingresos, gastos, transferencias y operaciones de inversión.' },
]

export const NAME_MAX_LENGTH = 60
const NAME_REQUIRED = 'Escribe un nombre para reconocer este token, por ejemplo Google Sheets.'
const NAME_TOO_LONG = `El nombre admite hasta ${NAME_MAX_LENGTH} caracteres.`
const SCOPES_REQUIRED = 'Elige al menos un permiso para el token.'

/** The prefix is public: it tells tokens apart. The secret is never kept after creation. */
export interface PersonalToken {
  id: number
  name: string
  prefix: string
  scopes: TokenScope[]
  createdAt: string
  revokedAt: string | null
}

export interface NewToken {
  name: string
  scopes: TokenScope[]
}

export type TokenField = 'name' | 'scopes'

interface TokenBody {
  id: number
  name: string
  prefix: string
  scopes: TokenScope[]
  created_at: string
  revoked_at: string | null
}

const LIST_FAILED = 'No pudimos cargar tus tokens. Revisa tu conexión e inténtalo de nuevo.'
const REVOKE_FAILED = 'No pudimos revocar el token. Inténtalo de nuevo.'
const TOKEN_GONE = 'Este token ya no existe. Actualiza la lista.'

const toToken = (body: TokenBody): PersonalToken => ({
  id: body.id,
  name: body.name,
  prefix: body.prefix,
  scopes: body.scopes,
  createdAt: body.created_at,
  revokedAt: body.revoked_at,
})

/** Judges a token the way webapp does, so the form can say what is wrong before sending it. */
export function validateToken(token: NewToken): FieldErrors<TokenField> | null {
  const errors: FieldErrors<TokenField> = {}
  const name = token.name.trim()
  if (name === '') errors.name = [NAME_REQUIRED]
  else if (name.length > NAME_MAX_LENGTH) errors.name = [NAME_TOO_LONG]
  if (token.scopes.length === 0) errors.scopes = [SCOPES_REQUIRED]
  return Object.keys(errors).length > 0 ? errors : null
}

export async function listTokens(): Promise<PersonalToken[]> {
  const body = await readJson<{ results: TokenBody[] }>('/users/me/tokens', { failed: LIST_FAILED })
  return body.results.map(toToken)
}

/** Creates a token; the secret comes back this once and cannot be read again. */
export function createToken(
  token: NewToken,
  csrfToken: string,
): Promise<Outcome<{ token: PersonalToken; secret: string }, TokenField>> {
  return write({
    method: 'POST',
    path: '/users/me/tokens',
    csrfToken,
    body: { name: token.name.trim(), scopes: token.scopes },
    fields: { name: 'name', scopes: 'scopes' },
    read: async (response) => {
      const body = (await response.json()) as { token: TokenBody; secret: string }
      return { token: toToken(body.token), secret: body.secret }
    },
  })
}

export function revokeToken(id: number, csrfToken: string): Promise<Outcome<void, 'form'>> {
  return write({
    method: 'DELETE',
    path: `/users/me/tokens/${id}`,
    csrfToken,
    gone: TOKEN_GONE,
    unavailable: REVOKE_FAILED,
    read: async () => undefined,
  })
}
