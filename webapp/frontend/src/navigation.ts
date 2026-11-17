import {
  Calculator,
  ChartLine,
  ChartPie,
  House,
  KeyRound,
  Plug,
  List,
  PiggyBank,
  Repeat,
  UserX,
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
const movements: Destination = { path: '/movements', name: 'Movimientos', icon: List }
const budgets: Destination = { path: '/budgets', name: 'Presupuestos', icon: PiggyBank }

// Routes follow docs/matrices.md.
export const navigationGroups: NavigationGroup[] = [
  { title: null, destinations: [dashboard, movements] },
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

export const integrations: Destination = { path: '/settings/integrations', name: 'Integraciones', icon: Plug }

export const userDeletion: Destination = { path: '/profile/delete', name: 'Eliminar usuario', icon: UserX }

/** The profile links shown in the sidebar and in Menú, in display order. */
export const profileDestinations: Destination[] = [integrations, changePassword, userDeletion]

export const allDestinations =navigationGroups.flatMap((group) => group.destinations)

/** Destinations that fit in the mobile bottom bar; the rest appear under the Spanish More label. */
export const bottomBarDestinations = { left: [dashboard, movements], right: [budgets] }
