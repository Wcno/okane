import { ChartLine, CreditCard, PiggyBank, Wallet, type LucideIcon } from 'lucide-react'
import { valorPosiciones, type Cuenta, type TipoCuenta } from '../../data/sample'
import { dinero } from '../../lib/dinero'
import { useNumeroAnimado } from '../../lib/useNumeroAnimado'
import { useDatos } from '../../state/store'
import { Tarjeta } from './Tarjeta'

const nombreDeTipo: Record<TipoCuenta, string> = {
  gastos: 'Gastos',
  ahorro: 'Ahorro',
  inversion: 'Inversión',
}

const iconoDeCuenta = (cuenta: Cuenta): LucideIcon => {
  if (cuenta.tipo === 'ahorro') return PiggyBank
  if (cuenta.tipo === 'inversion') return ChartLine
  // Una tarjeta de crédito es una Cuenta de gastos con Saldo negativo.
  return cuenta.saldo < 0 ? CreditCard : Wallet
}

function Fila({ cuenta }: { cuenta: Cuenta }) {
  const Icono = iconoDeCuenta(cuenta)
  const esInversion = cuenta.tipo === 'inversion'
  // En una Cuenta de inversión se muestra su valor: efectivo más Posiciones.
  const valor = esInversion ? cuenta.saldo + valorPosiciones : cuenta.saldo
  const mostrado = useNumeroAnimado(valor)

  return (
    <li className="flex items-center gap-3.5 py-3 first:pt-1 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <Icono size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[1rem] font-medium">{cuenta.nombre}</h3>
        <p className="mt-0.5 text-[0.87rem] leading-snug tabular-nums text-ink-3">
          {esInversion
            ? `Efectivo ${dinero(cuenta.saldo)} · Posiciones ${dinero(valorPosiciones)}`
            : nombreDeTipo[cuenta.tipo]}
        </p>
      </div>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{dinero(mostrado)}</span>
    </li>
  )
}

/** Las Cuentas con su Saldo; la suma de todas es el Patrimonio. */
export function Cuentas() {
  const { estado } = useDatos()
  return (
    <Tarjeta id="cuentas" titulo="Cuentas" enlace={{ a: '/accounts', texto: 'Ver todas' }}>
      <ul className="mt-3 divide-y divide-line">
        {estado.cuentas.map((cuenta) => (
          <Fila key={cuenta.id} cuenta={cuenta} />
        ))}
      </ul>
    </Tarjeta>
  )
}
