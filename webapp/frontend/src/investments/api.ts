import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'
import type { RecordPage } from '../lib/recordPage'

/** An Asset of the catalog: identified by provider, market and symbol, never by symbol alone. */
export interface Asset {
  id: number
  provider: string
  market: string
  symbol: string
  name: string
  assetType: string
  currency: string
}

export interface AssetSearch {
  assets: Asset[]
  /** False when the quotes service did not answer: only known Assets are listed. */
  providerAvailable: boolean
}

export type TradeKind = 'buy' | 'sell'

export interface TradeInput {
  accountId: number
  assetId: number
  units: string
  unitPrice: string
  date: string
}

export interface Trade extends TradeInput {
  id: number
  type: TradeKind
  cashAmount: string
  /** The cash of the Account once this change is in. */
  accountBalance: string
}

/** A recorded purchase or sale as the list and the read-one screen show it, with its Asset. */
export interface Transaction extends TradeInput {
  id: number
  type: TradeKind
  cashAmount: string
  asset: Asset
}

export type TradeField = 'accountId' | 'assetId' | 'units' | 'unitPrice' | 'date'
export type TradeErrors = FieldErrors<TradeField>

export interface PositionAccount {
  accountId: number
  accountName: string
  units: string
  cost: string
  averageCost: string
}

/** The price a valuation uses, with the day it is from; one taken from the last transaction is an estimate. */
export interface ReferencePrice {
  value: string
  source: 'manual' | 'last_transaction'
  date: string
  estimated: boolean
}

/** What the User holds of one Asset, with the Accounts that add up to it. */
export interface Position {
  asset: Asset
  units: string
  cost: string
  averageCost: string
  price: ReferencePrice
  value: string
  /** A percentage with two decimals; null when the portfolio has no value to share. */
  portfolioPercent: string | null
  accounts: PositionAccount[]
}

/** Keep equal to QUERY_MAX_LENGTH in api-service/investments/views.py. */
export const ASSET_QUERY_MAX_LENGTH = 60

const SEARCH_FAILED = 'Okane no pudo buscar Activos. Espera un momento e inténtalo de nuevo.'
const POSITIONS_FAILED = 'Okane no pudo consultar tus Posiciones. Espera un momento e inténtalo de nuevo.'
const TRANSACTIONS_FAILED = 'Okane no pudo consultar tus Transacciones de inversión. Espera un momento e inténtalo de nuevo.'
const TRANSACTION_GONE = 'Esta Transacción de inversión ya no existe. Vuelve a la lista para verla al día.'
const ACCOUNT_OR_ASSET_GONE =
  'La Cuenta o el Activo elegido ya no existe. Vuelve a elegirlos para registrar la operación.'
const TRANSACTION_OR_ACCOUNT_GONE =
  'No encontramos esta Transacción de inversión o la Cuenta elegida. Vuelve a la lista para ver los datos al día.'

export interface AssetBody {
  id: number
  provider: string
  market: string
  symbol: string
  name: string
  asset_type: string
  currency: string
}

export const toAsset = (body: AssetBody): Asset => ({
  id: body.id,
  provider: body.provider,
  market: body.market,
  symbol: body.symbol,
  name: body.name,
  assetType: body.asset_type,
  currency: body.currency,
})

export async function searchAssets(query: string): Promise<AssetSearch> {
  const body = await readJson<{ results: AssetBody[]; provider_available: boolean }>(
    `/api/investments/assets/search?q=${encodeURIComponent(query)}`,
    { failed: SEARCH_FAILED },
  )
  return { assets: body.results.map(toAsset), providerAvailable: body.provider_available }
}

interface TradeBody {
  id: number
  type: TradeKind
  account_id: number
  asset_id: number
  units: string
  unit_price: string
  cash_amount: string
  date: string
  account_balance: string
}

interface TransactionBody extends Omit<TradeBody, 'account_balance'> {
  asset: AssetBody
}

const FORM_FIELDS: Record<string, TradeField> = {
  account_id: 'accountId',
  asset_id: 'assetId',
  units: 'units',
  unit_price: 'unitPrice',
  date: 'date',
}

const tradeBody = (trade: TradeInput) => ({
  account_id: trade.accountId,
  asset_id: trade.assetId,
  units: trade.units,
  unit_price: trade.unitPrice,
  date: trade.date,
})

const readTrade = async (response: Response): Promise<Trade> => {
  const body: TradeBody = await response.json()
  return {
    id: body.id,
    type: body.type,
    accountId: body.account_id,
    assetId: body.asset_id,
    units: body.units,
    unitPrice: body.unit_price,
    cashAmount: body.cash_amount,
    date: body.date,
    accountBalance: body.account_balance,
  }
}

export function recordTrade(kind: TradeKind, trade: TradeInput, csrfToken: string): Promise<Outcome<Trade, TradeField>> {
  return write({
    method: 'POST',
    path: `/api/investments/transactions/${kind}`,
    csrfToken,
    body: tradeBody(trade),
    fields: FORM_FIELDS,
    gone: ACCOUNT_OR_ASSET_GONE,
    read: readTrade,
  })
}

/** Corrects a recorded purchase or sale; its kind stays as it was recorded. */
export function updateTrade(id: number, trade: TradeInput, csrfToken: string): Promise<Outcome<Trade, TradeField>> {
  return write({
    method: 'PUT',
    path: `/api/investments/transactions/${id}`,
    csrfToken,
    body: tradeBody(trade),
    fields: FORM_FIELDS,
    gone: TRANSACTION_OR_ACCOUNT_GONE,
    read: readTrade,
  })
}

export function deleteTrade(id: number, csrfToken: string): Promise<Outcome<void, TradeField>> {
  return write({
    method: 'DELETE',
    path: `/api/investments/transactions/${id}`,
    csrfToken,
    gone: TRANSACTION_GONE,
    read: async () => undefined,
  })
}

const toTransaction = (body: TransactionBody): Transaction => ({
  id: body.id,
  type: body.type,
  accountId: body.account_id,
  assetId: body.asset_id,
  units: body.units,
  unitPrice: body.unit_price,
  cashAmount: body.cash_amount,
  date: body.date,
  asset: toAsset(body.asset),
})

const TRANSACTIONS_PAGE_SIZE = 50

/** One page of the User's Transactions, newest first. */
export async function listTransactions(page: number): Promise<RecordPage<Transaction>> {
  const body = await readJson<{ results: TransactionBody[]; total: number; next_page: number | null }>(
    `/api/investments/transactions?page_size=${TRANSACTIONS_PAGE_SIZE}&page=${page}`,
    { failed: TRANSACTIONS_FAILED },
  )
  return { records: body.results.map(toTransaction), total: body.total, nextPage: body.next_page }
}

/** One Transaction; throws NotFoundError when it is not the User's or no longer exists. */
export async function getTransaction(id: number): Promise<Transaction> {
  return toTransaction(
    await readJson<TransactionBody>(`/api/investments/transactions/${id}`, {
      failed: TRANSACTIONS_FAILED,
      gone: TRANSACTION_GONE,
    }),
  )
}

interface PositionBody {
  asset: AssetBody
  units: string
  cost: string
  average_cost: string
  price: ReferencePrice
  value: string
  portfolio_percent: string | null
  accounts: { account_id: number; account_name: string; units: string; cost: string; average_cost: string }[]
}

const POSITIONS_PAGE_SIZE = 200

/** The User's Positions, grouped by Asset; api-service pages them, so the list is read whole. */
export async function listPositions(): Promise<Position[]> {
  const positions: Position[] = []
  let page: number | null = 1
  while (page !== null) {
    const body: { results: PositionBody[]; next_page: number | null } = await readJson(
      `/api/investments/positions?page_size=${POSITIONS_PAGE_SIZE}&page=${page}`,
      { failed: POSITIONS_FAILED },
    )
    for (const item of body.results) {
      positions.push({
        asset: toAsset(item.asset),
        units: item.units,
        cost: item.cost,
        averageCost: item.average_cost,
        price: item.price,
        value: item.value,
        portfolioPercent: item.portfolio_percent,
        accounts: item.accounts.map((account) => ({
          accountId: account.account_id,
          accountName: account.account_name,
          units: account.units,
          cost: account.cost,
          averageCost: account.average_cost,
        })),
      })
    }
    page = body.next_page
  }
  return positions
}
