import type { CSSProperties } from 'react'
import { categoriaPorNombre } from '../../data/categorias'
import { comprometido, hoy, pagosPorVencer } from '../../data/sample'
import { dinero } from '../../lib/dinero'
import { Tarjeta } from './Tarjeta'

const enCuanto = (dia: number) => {
  const dias = dia - hoy.dia
  return dias === 1 ? 'Mañana' : `En ${dias} días`
}

/** Los Pagos recurrentes del mes que aún no vencen: lo que forma lo Comprometido. */
export function PagosPorVencer() {
  return (
    <Tarjeta
      id="pagos"
      titulo="Pagos recurrentes por vencer"
      enlace={{ a: '/recurring-payments', texto: 'Ver todos' }}
    >
      <p className="mt-1 text-[0.95rem] text-ink-3">
        Comprometido {dinero(comprometido)} hasta fin de mes
      </p>

      {pagosPorVencer.length === 0 ? (
        <p className="mt-4 text-ink-2">
          No queda ningún Pago recurrente por vencer este mes. Todo el Saldo de tus Cuentas de
          gastos está disponible.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {pagosPorVencer.map((pago) => {
            const categoria = categoriaPorNombre(pago.categoria)
            return (
              <li
                key={pago.id}
                style={{ '--tono': categoria.tono } as CSSProperties}
                className="flex items-center gap-3.5 py-3 first:pt-1 last:pb-0"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-center leading-none">
                  <div>
                    <div className="text-[1.05rem] font-semibold tabular-nums">{pago.dia}</div>
                    <div className="mt-0.5 text-[0.72rem] text-ink-3">{hoy.mesCorto}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[1rem] font-medium">{pago.nombre}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[0.87rem] text-ink-3">
                    <span className="size-2 shrink-0 rounded-full bg-(--tono)" aria-hidden="true" />
                    <span className="truncate">
                      {pago.categoria} · {enCuanto(pago.dia)}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-[1rem] font-semibold tabular-nums">
                  {dinero(pago.monto)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Tarjeta>
  )
}
