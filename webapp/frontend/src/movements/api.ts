import type { Expense } from '../expenses/api'
import type { Income } from '../incomes/api'
import { toAsset, type Asset, type AssetBody, type TradeKind, type Transaction } from '../investments/api'
import { readJson } from '../lib/http'
import type { RecordPage } from '../lib/recordPage'
import type { Transfer } from '../transfers/api'

/**
 * One line of the Movements view: the record of its own kind, with the date
 * and the id that identify it. An id alone is not unique; the type is part of it.
 */
export type Movement =
  | { type: 'expense'; id: number; date: string; record: Expense }
  | { type: 'income'; id: number; date: string; record: Income }
  | { type: 'transfer'; id: number; date: string; record: Transfer }
  | { type: TradeKind; id: number; date: string; record: Transaction }

export type MovementType = Movement['type']

/** The order the filter lists the types in. */
export const MOVEMENT_TYPES: MovementType[] = ['expense', 'income', 'transfer', 'buy', 'sell', 'dividend']

export const isMovementType = (text: string | null): text is MovementType =>
  MOVEMENT_TYPES.includes(text as MovementType)

/** What narrows the view; an empty filter is every type, Account and day. */
export interface MovementFilter {
  /** Empty is every type. */
  types: MovementType[]
  accountId: number | null
  from: string
  to: string
}

const LIST_FAILED = 'Okane no pudo consultar tus movimientos. Espera un momento e inténtalo de nuevo.'
const FILTER_GONE = 'La Cuenta elegida ya no existe. Elige otra o quita el filtro.'
const MOVEMENTS_PAGE_SIZE = 50

/** What every line carries; the rest depends on its type, and what a type does not have comes as `null`. */
interface CommonBody {
  id: number
  date: string
  amount: string
  account_id: number
  description: string
}

type MovementBody =
  | (CommonBody & { type: 'expense'; category_id: number })
  | (CommonBody & { type: 'income' })
  | (CommonBody & { type: 'transfer'; destination_account_id: number })
  | (CommonBody & {
      type: TradeKind
      asset: AssetBody
      units: string | null
      unit_price: string | null
      commission: string
    })

function toMovement(body: MovementBody): Movement {
  const { id, date } = body
  switch (body.type) {
    case 'expense':
      return {
        type: body.type,
        id,
        date,
        record: {
          id,
          date,
          amount: body.amount,
          accountId: body.account_id,
          categoryId: body.category_id,
          // The view does not say which reserve confirmed an Expense; the edit screen reads it.
          recurringPaymentOccurrenceId: null,
          description: body.description,
        },
      }
    case 'income':
      return {
        type: body.type,
        id,
        date,
        record: { id, date, amount: body.amount, accountId: body.account_id, description: body.description },
      }
    case 'transfer':
      return {
        type: body.type,
        id,
        date,
        record: {
          id,
          date,
          amount: body.amount,
          sourceAccountId: body.account_id,
          destinationAccountId: body.destination_account_id,
          description: body.description,
        },
      }
    default: {
      const asset: Asset = toAsset(body.asset)
      return {
        type: body.type,
        id,
        date,
        record: {
          id,
          date,
          type: body.type,
          asset,
          assetId: asset.id,
          accountId: body.account_id,
          cashAmount: body.amount,
          units: body.units,
          unitPrice: body.unit_price,
          commission: body.commission,
        },
      }
    }
  }
}

/** The key of a Movement in a list: two kinds of record may share an id. */
export const movementKey = (movement: Pick<Movement, 'type' | 'id'>) => `${movement.type}-${movement.id}`

function query(filter: MovementFilter, page: number) {
  const params = new URLSearchParams({ page_size: String(MOVEMENTS_PAGE_SIZE), page: String(page) })
  for (const type of filter.types) params.append('type', type)
  if (filter.accountId !== null) params.set('account_id', String(filter.accountId))
  if (filter.from) params.set('from', filter.from)
  if (filter.to) params.set('to', filter.to)
  return params.toString()
}

/** One page of the User's Movements, newest first; throws NotFoundError when the filter names an Account that is not theirs. */
export async function listMovements(filter: MovementFilter, page: number): Promise<RecordPage<Movement>> {
  const body = await readJson<{ results: MovementBody[]; total: number; next_page: number | null }>(
    `/api/movements?${query(filter, page)}`,
    { failed: LIST_FAILED, gone: FILTER_GONE },
  )
  return { records: body.results.map(toMovement), total: body.total, nextPage: body.next_page }
}
