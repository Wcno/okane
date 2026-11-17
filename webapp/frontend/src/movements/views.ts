import { ArrowDownToLine, ArrowLeftRight, ChartLine, ReceiptText, type LucideIcon } from 'lucide-react'
import { NEEDS_AN_ACCOUNT_FOR_EXPENSE } from '../expenses/presentation'
import { NEEDS_AN_ACCOUNT_FOR_INCOME } from '../incomes/presentation'
import { NEEDS_TWO_ACCOUNTS } from '../transfers/presentation'
import type { MovementType } from './api'

export const INVESTMENT_TYPES: MovementType[] = ['buy', 'sell', 'dividend']

/** What the User needs before a record can be registered: money Accounts, or two Accounts to move between. */
export type Need = 'money' | 'transfers'

export interface Create {
  to: string
  label: string
  shortLabel?: string
  needs?: Need
}

const income: Create = { to: '/incomes/create', label: 'Registrar ingreso', shortLabel: 'Ingreso', needs: 'money' }
const transfer: Create = { to: '/transfers/create', label: 'Registrar transferencia', shortLabel: 'Nueva', needs: 'transfers' }
const purchase: Create = { to: '/investments/transactions/buy', label: 'Registrar compra', shortLabel: 'Comprar' }
const dividend: Create = { to: '/investments/transactions/dividend', label: 'Registrar dividendo' }

/** What an address with nothing registered asks for first, and what it asks for instead when an Account is missing. */
interface FirstRecord {
  create: Create
  withoutAccount?: { to: string; label: string; note?: string }
}

const firstAccount = { to: '/accounts/create', label: 'Crear tu primera cuenta' }

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
  /**
   * The primary action of the header. The shell already offers "Registrar gasto"
   * everywhere, so the views of Gastos and of every type have none of their own.
   */
  create: Create | null
  /** Smaller links to register the other kinds of record. */
  others: Create[]
  first: FirstRecord
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
    create: null,
    others: [income, transfer, purchase, dividend],
    first: {
      create: { to: '/expenses/create', label: 'Registrar un gasto', needs: 'money' },
      withoutAccount: firstAccount,
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
    create: null,
    others: [],
    first: {
      create: { to: '/expenses/create', label: 'Registrar tu primer gasto', needs: 'money' },
      withoutAccount: { ...firstAccount, note: NEEDS_AN_ACCOUNT_FOR_EXPENSE },
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
    create: income,
    others: [],
    first: {
      create: { to: '/incomes/create', label: 'Registrar tu primer ingreso', needs: 'money' },
      withoutAccount: { ...firstAccount, note: NEEDS_AN_ACCOUNT_FOR_INCOME },
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
    create: transfer,
    others: [],
    first: {
      create: { to: '/transfers/create', label: 'Registrar tu primera transferencia', needs: 'transfers' },
      withoutAccount: { to: '/accounts/create', label: 'Crear una cuenta', note: NEEDS_TWO_ACCOUNTS },
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
    create: purchase,
    others: [dividend],
    first: { create: { to: '/investments/transactions/buy', label: 'Registrar tu primera compra' } },
  },
}

export const sameTypes = (first: MovementType[], second: MovementType[]) =>
  first.length === second.length && first.every((type) => second.includes(type))
