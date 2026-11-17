import {
  ArrowDownToLine,
  ArrowLeftRight,
  Calculator,
  ChartLine,
  ChartPie,
  House,
  KeyRound,
  List,
  PiggyBank,
  ReceiptText,
  Repeat,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface Destination {
  path: string
  name: string
  icon: LucideIcon
}

export interface NavigationGroup {
  title: string | null
  destinations: Destination[]
}

export const dashboard: Destination = { path: '/dashboard', name: 'Panel', icon: House }
const spending: Destination = { path: '/expenses', name: 'Gastos', icon: ReceiptText }
const budgets: Destination = { path: '/budgets', name: 'Presupuestos', icon: PiggyBank }

// Routes follow docs/matrices.md.
export const navigationGroups: NavigationGroup[] = [
  { title: null, destinations: [dashboard] },
  {
    title: 'Movimientos',
    destinations: [
      { path: '/movements', name: 'Movimientos', icon: List },
      spending,
      { path: '/incomes', name: 'Ingresos', icon: ArrowDownToLine },
      { path: '/transfers', name: 'Transferencias', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Planificación',
    destinations: [
      budgets,
      { path: '/recurring-payments', name: 'Pagos recurrentes', icon: Repeat },
      { path: '/savings/projection', name: 'Proyección', icon: Calculator },
    ],
  },
  {
    title: 'Patrimonio',
    destinations: [
      { path: '/accounts', name: 'Cuentas', icon: Wallet },
      { path: '/investments/dashboard', name: 'Inversiones', icon: ChartLine },
      { path: '/investments/positions', name: 'Posiciones', icon: ChartPie },
    ],
  },
]

/** Reached from the User's own block of the sidebar and of Menú, not from the sections. */
export const changePassword: Destination = { path: '/profile/change-password', name: 'Cambiar contraseña', icon: KeyRound }

export const allDestinations =navigationGroups.flatMap((group) => group.destinations)

/** Destinations that fit in the mobile bottom bar; the rest appear under the Spanish More label. */
export const bottomBarDestinations = { left: [dashboard, spending], right: [budgets] }
