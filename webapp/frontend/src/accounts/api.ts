export type AccountType = 'spending' | 'savings' | 'investment'

/** An Account as api-service describes it. Amounts stay decimal strings. */
export interface Account {
  id: number
  name: string
  type: AccountType
  openingBalance: string
  openingDate: string
  /** A ratio: 4.25% is "0.042500". Only a savings Account has one. */
  annualInterestRate: string | null
  /** Derived from the opening balance and what was recorded; never edited. */
  balance: string
  /** An Account with records is archived instead of deleted. */
  hasRecords: boolean
  archivedAt: string | null
}

export interface NewAccount {
  name: string
  type: AccountType
  openingBalance: string
  openingDate: string
  annualInterestRate: string | null
}

export interface AccountChanges {
  name: string
  /** Left out, the stored rate stays; null clears it. */
  annualInterestRate?: string | null
}

export type AccountField = 'name' | 'type' | 'openingBalance' | 'openingDate' | 'annualInterestRate' | 'form'
export type AccountErrors = Partial<Record<AccountField, string[]>>

export type Outcome<T> =
  | { ok: true; value: T }
  /** sessionEnded: webapp no longer knows the User; the screen asks to sign in again. */
  | { ok: false; errors: AccountErrors; sessionEnded: boolean }

export type Removal = { result: 'deleted' } | { result: 'archived'; account: Account }

const CONNECTION_LOST = 'No pudimos conectar con Okane. Revisa tu conexión e inténtalo de nuevo.'
const LIST_FAILED = 'Okane no pudo consultar tus Cuentas. Espera un momento e inténtalo de nuevo.'
const WRITE_FAILED = 'Okane no pudo guardar el cambio. Espera un momento e inténtalo de nuevo.'
const SESSION_ENDED = 'Tu sesión terminó. Inicia sesión de nuevo para continuar.'
const ACCOUNT_GONE = 'Esta Cuenta ya no existe. Vuelve a tus Cuentas para ver la lista al día.'

/** The list could not be read; its message is ready to show. */
export class AccountsRequestError extends Error {}

/** webapp answered that nobody is signed in. */
export class SessionEndedError extends Error {}

interface AccountBody {
  id: number
  name: string
  type: AccountType
  opening_balance: string
  opening_date: string
  annual_interest_rate: string | null
  balance: string
  has_records: boolean
  archived_at: string | null
}

const toAccount = (body: AccountBody): Account => ({
  id: body.id,
  name: body.name,
  type: body.type,
  openingBalance: body.opening_balance,
  openingDate: body.opening_date,
  annualInterestRate: body.annual_interest_rate,
  balance: body.balance,
  hasRecords: body.has_records,
  archivedAt: body.archived_at,
})

const FORM_FIELDS: Record<string, AccountField> = {
  name: 'name',
  type: 'type',
  opening_balance: 'openingBalance',
  opening_date: 'openingDate',
  annual_interest_rate: 'annualInterestRate',
}

const PAGE_SIZE = 200

export async function listAccounts(): Promise<Account[]> {
  const accounts: Account[] = []
  let page: number | null = 1
  while (page !== null) {
    let response: Response
    try {
      response = await fetch(`/api/accounts?page_size=${PAGE_SIZE}&page=${page}`, {
        headers: { Accept: 'application/json' },
      })
    } catch {
      throw new AccountsRequestError(CONNECTION_LOST)
    }
    if (response.status === 401) throw new SessionEndedError(SESSION_ENDED)
    if (!response.ok) throw new AccountsRequestError(LIST_FAILED)
    const body: { results: AccountBody[]; next_page: number | null } = await response.json()
    accounts.push(...body.results.map(toAccount))
    page = body.next_page
  }
  return accounts
}

async function readErrors(response: Response): Promise<AccountErrors> {
  if (response.status === 401) return { form: [SESSION_ENDED] }
  if (response.status === 404) return { form: [ACCOUNT_GONE] }
  try {
    const body = await response.json()
    if (body && typeof body.errors === 'object') {
      const errors: AccountErrors = {}
      for (const [field, messages] of Object.entries(body.errors as Record<string, string[]>)) {
        const name = FORM_FIELDS[field] ?? 'form'
        errors[name] = [...(errors[name] ?? []), ...messages]
      }
      return errors
    }
  } catch {
    // A proxy or crash page is not JSON; fall through to the generic message.
  }
  return { form: [WRITE_FAILED] }
}

async function write<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  csrfToken: string,
  body: unknown,
  read: (response: Response) => Promise<T>,
): Promise<Outcome<T>> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return { ok: false, sessionEnded: false, errors: { form: [CONNECTION_LOST] } }
  }
  if (response.ok) return { ok: true, value: await read(response) }
  return { ok: false, sessionEnded: response.status === 401, errors: await readErrors(response) }
}

const readAccount = async (response: Response) => toAccount(await response.json())

export function createAccount(account: NewAccount, csrfToken: string): Promise<Outcome<Account>> {
  const body = {
    name: account.name,
    type: account.type,
    opening_balance: account.openingBalance,
    opening_date: account.openingDate,
    annual_interest_rate: account.annualInterestRate,
  }
  return write('POST', '/api/accounts', csrfToken, body, readAccount)
}

export function updateAccount(id: number, changes: AccountChanges, csrfToken: string): Promise<Outcome<Account>> {
  const body: { name: string; annual_interest_rate?: string | null } = { name: changes.name }
  if (changes.annualInterestRate !== undefined) body.annual_interest_rate = changes.annualInterestRate
  return write('PUT', `/api/accounts/${id}`, csrfToken, body, readAccount)
}

/** Deletes an Account without records; api-service archives one that has them. */
export function deleteAccount(id: number, csrfToken: string): Promise<Outcome<Removal>> {
  return write('DELETE', `/api/accounts/${id}`, csrfToken, undefined, async (response): Promise<Removal> => {
    if (response.status === 204) return { result: 'deleted' }
    return { result: 'archived', account: await readAccount(response) }
  })
}
