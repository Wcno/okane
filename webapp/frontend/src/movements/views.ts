import { ArrowDownToLine, ArrowLeftRight, ChartLine, ReceiptText, type LucideIcon } from 'lucide-react'
import type { MovementType } from './api'

export const INVESTMENT_TYPES: MovementType[] = ['buy', 'sell', 'dividend']

/**
 * One address of the Movements screen. `/movements` shows every type; the
 * routes each kind of record always had open the same screen with their type
 * chosen, so their links, bookmarks and "back to the list" keep working.
 */
export interface MovementView {
  /** The types chosen when the address names none; empty is every type. */
  types: MovementType[]
  title: string
  intro: string
  icon: LucideIcon
  loading: string
  /** "Mostrando 50 de 51 gastos." */
  noun: string
  empty: { title: string; text: string }
}

export type MovementViewName = 'all' | 'expense' | 'income' | 'transfer' | 'investments'

export const movementViews: Record<MovementViewName, MovementView> = {
  all: {
    types: [],
    title: 'Movimientos',
    intro: 'Tus gastos, ingresos, transferencias y operaciones de inversión, del más reciente al más antiguo.',
    icon: ArrowLeftRight,
    loading: 'Cargando tus movimientos…',
    noun: 'movimientos',
    empty: {
      title: 'Aún no registras movimientos',
      text: 'Cuando registres un gasto, un ingreso, una transferencia o una operación de inversión, aparecerá aquí.',
    },
  },
  expense: {
    types: ['expense'],
    title: 'Gastos',
    intro: 'Lo que has gastado, del más reciente al más antiguo.',
    icon: ReceiptText,
    loading: 'Cargando tus gastos…',
    noun: 'gastos',
    empty: {
      title: 'Aún no registras gastos',
      text: 'Anota el último que hiciste: el monto, su Categoría y la Cuenta de la que salió. El Saldo de esa Cuenta baja al instante.',
    },
  },
  income: {
    types: ['income'],
    title: 'Ingresos',
    intro: 'El dinero que ha entrado a tus Cuentas, del más reciente al más antiguo.',
    icon: ArrowDownToLine,
    loading: 'Cargando tus ingresos…',
    noun: 'ingresos',
    empty: {
      title: 'Aún no registras ingresos',
      text: 'Anota el último que recibiste: el monto y la Cuenta a la que entró. El Saldo de esa Cuenta sube al instante.',
    },
  },
  transfer: {
    types: ['transfer'],
    title: 'Transferencias',
    intro: 'El dinero que moviste entre tus Cuentas, del más reciente al más antiguo.',
    icon: ArrowLeftRight,
    loading: 'Cargando tus transferencias…',
    noun: 'transferencias',
    empty: {
      title: 'Aún no registras transferencias',
      text: 'Mueve dinero de una Cuenta a otra, por ejemplo al ahorro o a tu Cuenta de inversión. No cuenta como gasto y el total de tus Saldos no cambia.',
    },
  },
  investments: {
    types: INVESTMENT_TYPES,
    title: 'Transacciones de inversión',
    intro: 'Tus compras, ventas y dividendos, de la más reciente a la más antigua.',
    icon: ChartLine,
    loading: 'Cargando tus transacciones de inversión…',
    noun: 'transacciones de inversión',
    empty: {
      title: 'Aún no registras compras ni ventas',
      text: 'Cuando compres o vendas un Activo en tu Cuenta de inversión, aparecerá aquí con su importe y su Cuenta.',
    },
  },
}

export const sameTypes = (first: MovementType[], second: MovementType[]) =>
  first.length === second.length && first.every((type) => second.includes(type))
