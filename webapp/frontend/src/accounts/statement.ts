import { readJson } from '../lib/http'
import type { RecordPage } from '../lib/recordPage'

export type StatementLineKind = 'opening' | 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'buy' | 'sell' | 'dividend'

/** One line of an Account's Statement. Amounts stay decimal strings. */
export interface StatementLine {
  /** The place of the line in the whole Statement, oldest first: unique, whatever the page. */
  id: number
  kind: StatementLineKind
  /** The id of the Income, Expense, Transfer or Transaction that made the line; the Account's for the opening. */
  recordId: number
  date: string
  description: string
  /** Signed: what the movement added to or took from the Balance. */
  amount: string
  /** The Balance right after this line. */
  balance: string
  categoryId: number | null
  counterpartAccountId: number | null
  asset: { symbol: string; name: string } | null
  /** Absent in a Dividend. */
  units: string | null
  /** What the broker charged on a purchase or a sale; already inside `amount`. */
  commission: string | null
}

interface StatementLineBody {
  id: number
  kind: StatementLineKind
  record_id: number
  date: string
  description: string
  amount: string
  balance: string
  category_id?: number
  counterpart_account_id?: number
  asset?: { symbol: string; name: string }
  units?: string | null
  commission?: string | null
}

const STATEMENT_FAILED = 'Okane no pudo consultar el estado de cuenta. Espera un momento e inténtalo de nuevo.'
const ACCOUNT_GONE = 'Esta Cuenta ya no existe. Vuelve a tus Cuentas para elegirla de la lista.'

const STATEMENT_PAGE_SIZE = 50

const toLine = (body: StatementLineBody): StatementLine => ({
  id: body.id,
  kind: body.kind,
  recordId: body.record_id,
  date: body.date,
  description: body.description,
  amount: body.amount,
  balance: body.balance,
  categoryId: body.category_id ?? null,
  counterpartAccountId: body.counterpart_account_id ?? null,
  asset: body.asset ?? null,
  units: body.units ?? null,
  commission: body.commission ?? null,
})

/** One page of the Statement of an Account, oldest line first; throws NotFoundError for an Account that is not the User's. */
export async function listStatement(accountId: number, page: number): Promise<RecordPage<StatementLine>> {
  const body = await readJson<{ results: StatementLineBody[]; total: number; next_page: number | null }>(
    `/api/accounts/${accountId}/statement?order=asc&page_size=${STATEMENT_PAGE_SIZE}&page=${page}`,
    { failed: STATEMENT_FAILED, gone: ACCOUNT_GONE },
  )
  return { records: body.results.map(toLine), total: body.total, nextPage: body.next_page }
}
