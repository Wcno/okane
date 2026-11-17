import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Asset, Trade, Transaction, TradeKind } from './api'

export const positionsBack = { to: '/investments/positions', label: 'Posiciones' }
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

const kindNames: Record<TradeKind, string> = { buy: 'Compra', sell: 'Venta' }

/** "AAPL · Apple Inc · XNAS" as the title, and "Compra · 2 unidades a $100.00 · Bróker" as the details. */
export function describeTransaction(
  transaction: Transaction,
  accountName: string | undefined,
  options: { withDate?: boolean } = {},
): { title: string; details: string } {
  const details = [
    `${kindNames[transaction.type]} · ${unitsPhrase(transaction.units)} a ${formatPrice(transaction.unitPrice)}`,
    accountName,
    options.withDate && formatDay(transaction.date),
  ]
  return { title: describeAsset(transaction.asset), details: details.filter(Boolean).join(' · ') }
}

/** What happened to a recorded purchase or sale; the notice says it in Spanish. */
export type TradeChange = 'created' | 'updated' | 'deleted'

const nouns: Record<TradeKind, string> = { buy: 'compra', sell: 'venta' }

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
  const amount = `${unitsPhrase(trade.units)} de ${asset.symbol} por ${formatMoney(trade.cashAmount)}`
  const sentence =
    change === 'created'
      ? `${trade.type === 'buy' ? 'Compraste' : 'Vendiste'} ${amount}.`
      : `${change === 'updated' ? 'Guardaste' : 'Eliminaste'} la ${nouns[trade.type]} de ${amount}.`
  if (!account) return sentence
  const balance = `Saldo de ${account.name}: ${formatMoney(account.balance)}.`
  const negative = change === 'created' && trade.type === 'buy' && account.balance.startsWith('-')
  return negative
    ? `${sentence} ${balance} La compra se registró aunque la Cuenta no tenía efectivo suficiente; su Saldo quedó en negativo.`
    : `${sentence} ${balance}`
}
