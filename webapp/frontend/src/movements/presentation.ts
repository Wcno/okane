import type { Account } from '../accounts/api'
import { describeExpense } from '../expenses/presentation'
import { describeIncome } from '../incomes/presentation'
import { describeTransaction } from '../investments/presentation'
import { describeTransfer } from '../transfers/presentation'
import type { Movement, MovementType } from './api'

/** What the type filter offers, in the plural. */
export const movementTypeFilterNames: Record<MovementType, string> = {
  expense: 'Gastos',
  income: 'Ingresos',
  transfer: 'Transferencias',
  buy: 'Compras',
  sell: 'Ventas',
  dividend: 'Dividendos',
}

const editPaths: Record<MovementType, string> = {
  expense: '/expenses',
  income: '/incomes',
  transfer: '/transfers',
  buy: '/investments/transactions',
  sell: '/investments/transactions',
  dividend: '/investments/transactions',
}

export const editActions: Record<MovementType, string> = {
  expense: 'Editar gasto',
  income: 'Editar ingreso',
  transfer: 'Editar transferencia',
  buy: 'Editar compra',
  sell: 'Editar venta',
  dividend: 'Editar dividendo',
}

interface MovementText {
  title: string
  details: string
  amount: string
}

function describe(movement: Movement, accounts: Map<number, Account>): MovementText {
  const name = (accountId: number) => accounts.get(accountId)?.name
  switch (movement.type) {
    case 'expense':
      return {
        ...describeExpense(movement.record, name(movement.record.accountId)),
        amount: movement.record.amount,
      }
    case 'income':
      return {
        ...describeIncome(movement.record, name(movement.record.accountId)),
        amount: movement.record.amount,
      }
    case 'transfer':
      return { ...describeTransfer(movement.record, accounts), amount: movement.record.amount }
    default:
      return {
        ...describeTransaction(movement.record, name(movement.record.accountId)),
        amount: movement.record.cashAmount,
      }
  }
}

/** The type in words for the kinds whose own text does not say it; a purchase, a sale and a Dividend do. */
const typeLabels: Partial<Record<MovementType, string>> = {
  expense: 'Gasto',
  income: 'Ingreso',
  transfer: 'Transferencia',
}

/** A line of the view: what it is called, its type in words, where it is edited and how much it moved. */
export function describeMovement(movement: Movement, accounts: Map<number, Account>) {
  const { title, details, amount } = describe(movement, accounts)
  return {
    title,
    details: [typeLabels[movement.type], details].filter(Boolean).join(' · '),
    amount,
    to: `${editPaths[movement.type]}/${movement.id}/edit`,
    action: editActions[movement.type],
  }
}
