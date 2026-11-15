import {
  comprometido,
  diasRestantes,
  disponible,
  hoy,
  pagosPorVencer,
  saldoCuentasDeGastos,
} from '../../data/sample'
import { dinero, partesDeDinero } from '../../lib/dinero'
import { useNumeroAnimado } from '../../lib/useNumeroAnimado'
import { useDatos } from '../../state/store'
import { Tarjeta } from './Tarjeta'

/**
 * La primera respuesta del producto: cuánto se puede gastar hasta fin de mes,
 * abierta en las partes que la producen.
 */
export function Disponible() {
  const { estado } = useDatos()
  const valor = disponible(estado)
  const saldo = saldoCuentasDeGastos(estado)
  const mostrado = useNumeroAnimado(valor)
  const { signo, entero, centavos } = partesDeDinero(mostrado)
  const porDia = valor > 0 ? valor / diasRestantes : 0

  return (
    <Tarjeta titulo="Disponible hasta fin de mes" id="disponible">
      <p
        className="mt-2 text-[3.2rem] font-semibold leading-none tracking-[-0.035em] lg:text-[4.25rem]"
        aria-label={dinero(valor)}
      >
        <span aria-hidden="true">
          {signo}
          <span className="mr-0.5 text-[0.62em] font-medium text-ink-3">$</span>
          {entero}
          <span className="text-[0.5em] font-medium tracking-[-0.01em] text-ink-2">.{centavos}</span>
        </span>
      </p>

      <p className="mt-3.5 max-w-[46ch] text-ink-2">
        {valor > 0 ? (
          <>
            Son <strong className="font-semibold text-ink">{dinero(porDia)} por día</strong> durante
            los {diasRestantes} días que quedan de {hoy.mes}.
          </>
        ) : (
          <>
            Lo Comprometido supera el Saldo de tus Cuentas de gastos. Quedan {diasRestantes} días de{' '}
            {hoy.mes}.
          </>
        )}
      </p>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-4 text-[0.95rem]">
          <span className="text-ink-2">Saldo en Cuentas de gastos</span>
          <span className="font-semibold tabular-nums">{dinero(saldo)}</span>
        </div>

        <div
          className="mt-3 flex h-2 gap-0.5"
          role="img"
          aria-label={`Del Saldo en Cuentas de gastos, ${dinero(valor)} están disponibles y ${dinero(comprometido)} comprometidos.`}
        >
          <span
            className="rounded-full bg-ink transition-[flex-grow] duration-500 ease-out-quart"
            style={{ flexGrow: Math.max(valor, 0), flexBasis: 0 }}
          />
          <span className="rounded-full bg-ink/30" style={{ flexGrow: comprometido, flexBasis: 0 }} />
        </div>

        <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-2 text-[0.95rem]">
          <div className="flex items-baseline gap-2">
            <span className="size-2.5 translate-y-px rounded-full bg-ink" aria-hidden="true" />
            <dt className="text-ink-2">Disponible</dt>
            <dd className="font-semibold tabular-nums">{dinero(valor)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="size-2.5 translate-y-px rounded-full bg-ink/30" aria-hidden="true" />
            <dt className="text-ink-2">
              Comprometido en {pagosPorVencer.length} pagos
            </dt>
            <dd className="font-semibold tabular-nums">{dinero(comprometido)}</dd>
          </div>
        </dl>
      </div>
    </Tarjeta>
  )
}
