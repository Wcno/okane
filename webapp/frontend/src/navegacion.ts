import {
  ArrowDownToLine,
  ArrowLeftRight,
  Calculator,
  ChartLine,
  House,
  PiggyBank,
  ReceiptText,
  Repeat,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface Destino {
  ruta: string
  nombre: string
  icono: LucideIcon
}

export interface Grupo {
  titulo: string | null
  destinos: Destino[]
}

export const panel: Destino = { ruta: '/dashboard', nombre: 'Panel', icono: House }
const gastos: Destino = { ruta: '/expenses', nombre: 'Gastos', icono: ReceiptText }
const presupuestos: Destino = { ruta: '/budgets', nombre: 'Presupuestos', icono: PiggyBank }

// Las rutas son las de docs/matrices.md.
export const grupos: Grupo[] = [
  { titulo: null, destinos: [panel] },
  {
    titulo: 'Movimientos',
    destinos: [
      gastos,
      { ruta: '/incomes', nombre: 'Ingresos', icono: ArrowDownToLine },
      { ruta: '/transfers', nombre: 'Transferencias', icono: ArrowLeftRight },
    ],
  },
  {
    titulo: 'Planificación',
    destinos: [
      presupuestos,
      { ruta: '/recurring-payments', nombre: 'Pagos recurrentes', icono: Repeat },
      { ruta: '/savings/projection', nombre: 'Proyección', icono: Calculator },
    ],
  },
  {
    titulo: 'Patrimonio',
    destinos: [
      { ruta: '/accounts', nombre: 'Cuentas', icono: Wallet },
      { ruta: '/investments/dashboard', nombre: 'Inversiones', icono: ChartLine },
    ],
  },
]

export const todosLosDestinos = grupos.flatMap((grupo) => grupo.destinos)

/** Lo que cabe en la barra inferior del teléfono; el resto vive en "Más". */
export const destinosDeBarra = { izquierda: [panel, gastos], derecha: [presupuestos] }
