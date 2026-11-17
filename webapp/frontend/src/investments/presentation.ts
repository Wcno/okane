import type { Account } from '../accounts/api'
import { formatMoney } from '../lib/money'
import type { Asset, Trade, TradeKind } from './api'

export const positionsBack = { to: '/investments/positions', label: 'Posiciones' }

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
