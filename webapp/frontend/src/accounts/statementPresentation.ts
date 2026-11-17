import { categoryById } from '../data/categories'
import { unitsPhrase } from '../investments/presentation'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Account } from './api'
import type { StatementLine } from './statement'

type MovementLine = StatementLine & { kind: Exclude<StatementLine['kind'], 'opening'> }

export const isMovement = (line: StatementLine): line is MovementLine => line.kind !== 'opening'

/** Where a movement's link leads, and what a screen reader hears after its visible text. */
export function lineLink(line: MovementLine): { to: string; action: string } {
  switch (line.kind) {
    case 'income':
      return { to: `/incomes/${line.recordId}/edit`, action: 'Editar ingreso' }
    case 'expense':
      return { to: `/expenses/${line.recordId}/edit`, action: 'Editar gasto' }
    case 'transfer_in':
    case 'transfer_out':
      return { to: `/transfers/${line.recordId}/edit`, action: 'Editar transferencia' }
    case 'buy':
    case 'sell':
    case 'dividend':
      return { to: `/investments/transactions/${line.recordId}/edit`, action: 'Editar transacción' }
  }
}

/** "Saldo $1,379.90": the Balance right after the line, the figure to compare with the bank. */
export const balanceAfter = (line: StatementLine) => `Saldo ${formatMoney(line.balance)}`

/** The line that starts the Statement: its date; its Balance is shown after it, like on every line. */
export const describeOpening = (line: StatementLine) => ({
  title: 'Saldo inicial',
  details: formatDay(line.date),
})

/** "Comisión $1.50": what the broker took, already counted in the line's amount. */
const commissionText = (line: StatementLine) =>
  line.commission && Number(line.commission) > 0 ? `Comisión ${formatMoney(line.commission)}` : ''

/** What a movement is called and what is known about it. */
export function describeMovement(
  line: MovementLine,
  accounts: Map<number, Account>,
): { title: string; details: string } {
  const counterpart = accounts.get(line.counterpartAccountId ?? -1)?.name ?? 'otra Cuenta'
  let title: string
  let detail: string
  switch (line.kind) {
    case 'income':
      title = line.description || 'Ingreso'
      detail = line.description && 'Ingreso'
      break
    case 'expense': {
      const category = categoryById(line.categoryId ?? 0).name
      title = line.description || category
      detail = line.description && category
      break
    }
    case 'transfer_in':
      title = line.description || `Transferencia de ${counterpart}`
      detail = line.description && `De ${counterpart}`
      break
    case 'transfer_out':
      title = line.description || `Transferencia a ${counterpart}`
      detail = line.description && `A ${counterpart}`
      break
    case 'buy':
    case 'sell': {
      const symbol = line.asset?.symbol ?? 'un Activo'
      title = `${line.kind === 'buy' ? 'Compra' : 'Venta'} de ${symbol}`
      detail = [line.asset?.name, line.units && unitsPhrase(line.units), commissionText(line)].filter(Boolean).join(' · ')
      break
    }
    case 'dividend':
      title = `Dividendo de ${line.asset?.symbol ?? 'un Activo'}`
      detail = line.asset?.name ?? ''
      break
  }
  return { title, details: detail }
}
