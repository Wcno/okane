import { netCash } from './form'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Asset, ReferencePrice, Trade, TradeKind, Transaction } from './api'

export const positionsBack = { to: '/investments/positions', label: 'Posiciones' }
export const performancePath = '/investments/performance'
export const dashboardBack = { to: '/investments/dashboard', label: 'Inversiones' }

const MINUS = '−'

/** "12.50" as "+12.50 %" and "-30.00" as "−30.00 %"; "No aplica" when there is no positive base. */
export function formatPercent(percent: string | null): string {
  if (percent === null) return 'No aplica'
  if (percent.startsWith('-')) return `${MINUS}${percent.slice(1)} %`
  return Number(percent) > 0 ? `+${percent} %` : `${percent} %`
}

const PRICE_ORIGINS: Record<ReferencePrice['source'], string> = {
  manual: 'fijado por ti',
  provider: 'del servicio de cotizaciones',
  last_transaction: 'de tu última operación',
}

/** Where a price comes from and its day: what every price shown on screen says. */
export function priceOrigin(price: ReferencePrice): string {
  const origin = PRICE_ORIGINS[price.source]
  return `Precio ${formatPrice(price.value)} ${origin}, ${formatDay(price.date)}${price.estimated ? ' (estimado)' : ''}`
}

/** The hue of the Asset at `position` of the distribution: the seven validated hues in their fixed order, then neutral. */
export function distributionTone(position: number): string {
  return `var(--cat-${position < 7 ? position + 1 : 0})`
}

export type Trend = 'gain' | 'loss' | 'flat'

/** Whether an amount is a gain, a loss or nothing; a negative zero is nothing. */
export function trendOf(amount: string): Trend {
  const value = Number(amount)
  return value > 0 ? 'gain' : value < 0 ? 'loss' : 'flat'
}
export const transactionsBack = { to: '/investments/transactions', label: 'Transacciones' }

/** "2.50000000" as "2.5": units as a person reads them, without trailing zeros. */
export function formatUnits(units: string): string {
  return units.includes('.') ? units.replace(/0+$/, '').replace(/\.$/, '') : units
}

/** "187.35000000" as "$187.35" and "0.12345678" as "$0.12345678": at least cents, never more than the price has. */
export function formatPrice(price: string): string {
  const [whole, fraction = ''] = price.split('.')
  const decimals = fraction.replace(/0+$/, '').padEnd(2, '0')
  return `${formatMoney(`${whole}.00`).replace(/\.00$/, '')}.${decimals}`
}

export const unitsPhrase = (units: string) => {
  const text = formatUnits(units)
  return `${text} ${text === '1' ? 'unidad' : 'unidades'}`
}

/** "AAPL · Apple Inc · XNAS": what tells two assets with one symbol apart. */
export const describeAsset = (asset: Pick<Asset, 'symbol' | 'name' | 'market'>) =>
  `${asset.symbol} · ${asset.name} · ${asset.market}`

const kindNames: Record<TradeKind, string> = { buy: 'Compra', sell: 'Venta', dividend: 'Dividendo' }

/** The cash a record moves in the Account: a purchase with its commission, a sale net of it, a Dividend as paid. */
export const cashMoved = (transaction: Pick<Transaction, 'type' | 'cashAmount' | 'commission'>) =>
  transaction.type === 'dividend'
    ? transaction.cashAmount
    : netCash(transaction.type, transaction.cashAmount, transaction.commission)

/** "AAPL · Apple Inc · XNAS" as the title, and "Compra · 2 unidades a $100.00 · Bróker" as the details. */
export function describeTransaction(
  transaction: Transaction,
  accountName: string | undefined,
  options: { withDate?: boolean } = {},
): { title: string; details: string } {
  const trade =
    transaction.units === null || transaction.unitPrice === null
      ? kindNames[transaction.type]
      : `${kindNames[transaction.type]} · ${unitsPhrase(transaction.units)} a ${formatPrice(transaction.unitPrice)}`
  const details = [
    transaction.commission === '0.00' ? trade : `${trade} · comisión ${formatMoney(transaction.commission)}`,
    accountName,
    options.withDate && formatDay(transaction.date),
  ]
  return { title: describeAsset(transaction.asset), details: details.filter(Boolean).join(' · ') }
}

/** What happened to a recorded purchase or sale; the notice says it in Spanish. */
export type TradeChange = 'created' | 'updated' | 'deleted'

export const nouns: Record<TradeKind, string> = { buy: 'compra', sell: 'venta', dividend: 'dividendo' }

/**
 * What the notice says after a purchase or a sale, with the cash the Account has left.
 * A purchase that left the Account in negative cash says so when it is recorded.
 */
export function tradeNotice(
  change: TradeChange,
  trade: Pick<Trade, 'type' | 'units' | 'cashAmount'>,
  asset: Pick<Asset, 'symbol'>,
  account: { name: string; balance: string } | undefined,
): string {
  const amount =
    trade.units === null
      ? `${asset.symbol} por ${formatMoney(trade.cashAmount)}`
      : `${unitsPhrase(trade.units)} de ${asset.symbol} por ${formatMoney(trade.cashAmount)}`
  const created = { buy: 'Compraste', sell: 'Vendiste', dividend: 'Registraste el dividendo de' }[trade.type]
  const sentence =
    change === 'created'
      ? `${created} ${amount}.`
      : `${change === 'updated' ? 'Guardaste' : 'Eliminaste'} ${trade.type === 'dividend' ? 'el' : 'la'} ${nouns[trade.type]} de ${amount}.`
  if (!account) return sentence
  const balance = `Saldo de ${account.name}: ${formatMoney(account.balance)}.`
  const negative = change === 'created' && trade.type === 'buy' && account.balance.startsWith('-')
  return negative
    ? `${sentence} ${balance} La compra se registró aunque la Cuenta no tenía efectivo suficiente; su Saldo quedó en negativo.`
    : `${sentence} ${balance}`
}
