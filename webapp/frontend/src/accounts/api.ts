import {
  CONNECTION_LOST,
  SESSION_ENDED,
  SessionEndedError,
  write,
  type FieldErrors,
  type Outcome as SharedOutcome,
} from '../lib/http'

export { SessionEndedError }

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

export type AccountField = 'name' | 'type' | 'openingBalance' | 'openingDate' | 'annualInterestRate'
export type AccountErrors = FieldErrors<AccountField>

export type Outcome<T> = SharedOutcome<T, AccountField>

export type Removal = { result: 'deleted' } | { result: 'archived'; account: Account }

const LIST_FAILED = 'Okane no pudo consultar tus Cuentas. Espera un momento e inténtalo de nuevo.'
const ACCOUNT_GONE = 'Esta Cuenta ya no existe. Vuelve a tus Cuentas para ver la lista al día.'

/** The list could not be read; its message is ready to show. */
export class AccountsRequestError extends Error {}

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

const readAccount = async (response: Response) => toAccount(await response.json())

export function createAccount(account: NewAccount, csrfToken: string): Promise<Outcome<Account>> {
  const body = {
    name: account.name,
    type: account.type,
    opening_balance: account.openingBalance,
    opening_date: account.openingDate,
    annual_interest_rate: account.annualInterestRate,
  }
  return write({
    method: 'POST',
    path: '/api/accounts',
    csrfToken,
    body,
    fields: FORM_FIELDS,
    gone: ACCOUNT_GONE,
    read: readAccount,
  })
}

export function updateAccount(id: number, changes: AccountChanges, csrfToken: string): Promise<Outcome<Account>> {
  const body: { name: string; annual_interest_rate?: string | null } = { name: changes.name }
  if (changes.annualInterestRate !== undefined) body.annual_interest_rate = changes.annualInterestRate
  return write({
    method: 'PUT',
    path: `/api/accounts/${id}`,
    csrfToken,
    body,
    fields: FORM_FIELDS,
    gone: ACCOUNT_GONE,
    read: readAccount,
  })
}

/** Deletes an Account without records; api-service archives one that has them. */
export function deleteAccount(id: number, csrfToken: string): Promise<Outcome<Removal>> {
  return write({
    method: 'DELETE',
    path: `/api/accounts/${id}`,
    csrfToken,
    fields: FORM_FIELDS,
    gone: ACCOUNT_GONE,
    read: async (response): Promise<Removal> => {
      if (response.status === 204) return { result: 'deleted' }
      return { result: 'archived', account: await readAccount(response) }
    },
  })
}
