import type { Account } from '../accounts/api'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Asset, ReferencePrice, Trade, TradeKind } from './api'

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

/** Where a price comes from and its day: what every price shown on screen says. */
export function priceOrigin(price: ReferencePrice): string {
  const origin = price.source === 'manual' ? 'fijado por ti' : 'de tu última operación'
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

const verbs: Record<TradeKind, string> = { buy: 'Compraste', sell: 'Vendiste' }

/** What the notice says after a purchase or a sale, with the cash the Account has left. */
export function tradeNotice(trade: Trade, asset: Asset, account: Pick<Account, 'name'>): string {
  const sentence = `${verbs[trade.type]} ${unitsPhrase(trade.units)} de ${asset.symbol} por ${formatMoney(trade.cashAmount)}.`
  const balance = `Saldo de ${account.name}: ${formatMoney(trade.accountBalance)}.`
  const negative = trade.type === 'buy' && trade.accountBalance.startsWith('-')
  return negative
    ? `${sentence} ${balance} La compra se registró aunque la Cuenta no tenía efectivo suficiente; su Saldo quedó en negativo.`
    : `${sentence} ${balance}`
}
