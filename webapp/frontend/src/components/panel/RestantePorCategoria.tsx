import { CircleAlert } from 'lucide-react'
import type { CSSProperties } from 'react'
import { categoriaPorNombre } from '../../data/categorias'
import {
  comprometidoPorCategoria,
  gastosDelMes,
  restante,
  sumar,
  type LineaPresupuesto,
} from '../../data/sample'
import { dinero } from '../../lib/dinero'
import { useNumeroAnimado } from '../../lib/useNumeroAnimado'
import { useDatos } from '../../state/store'
import { Tarjeta } from './Tarjeta'

function Medidor({ linea, comprometido }: { linea: LineaPresupuesto; comprometido: number }) {
  const presupuesto = linea.presupuesto ?? 0
  const usado = linea.gastado + comprometido

  // Excedida: la barra pasa a representar todo lo usado, y la parte que
  // sobrepasa el Presupuesto se pinta con el color de estado crítico.
  if (presupuesto > 0 && usado > presupuesto) {
    const dentro = (presupuesto / usado) * 100
    return (
      <div
        className="mt-2.5 flex h-2 gap-0.5"
        role="img"
        aria-label={`Presupuesto excedido en ${Math.round(100 - dentro)}% de lo usado.`}
      >
        <span
          className="rounded-full bg-(--tono) transition-[width] duration-500 ease-out-quart"
          style={{ width: `${dentro}%` }}
        />
        <span className="flex-1 rounded-full bg-critical" />
      </div>
    )
  }

  const gastado = presupuesto > 0 ? (linea.gastado / presupuesto) * 100 : 0
  const reservado = presupuesto > 0 ? (comprometido / presupuesto) * 100 : 0

  return (
    <div
      className="mt-2.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--tono)_17%,var(--surface))]"
      role="img"
      aria-label={`Gastado ${Math.round(gastado)}% del Presupuesto${
        comprometido > 0 ? `, comprometido ${Math.round(reservado)}%` : ''
      }.`}
    >
      {gastado > 0 && (
        <span
          className="rounded-full bg-(--tono) transition-[width] duration-500 ease-out-quart"
          style={{ width: `${gastado}%` }}
        />
      )}
      {reservado > 0 && (
        <span
          className="rounded-full bg-[color-mix(in_oklab,var(--tono)_48%,var(--surface))] transition-[width] duration-500 ease-out-quart"
          style={{ width: `${reservado}%` }}
        />
      )}
    </div>
  )
}

function Fila({ linea, resaltado }: { linea: LineaPresupuesto; resaltado: string }) {
  const categoria = categoriaPorNombre(linea.categoria)
  const Icono = categoria.icono
  const comprometido = comprometidoPorCategoria(linea.categoria)
  const valor = restante(linea)
  const mostrado = useNumeroAnimado(valor ?? 0)
  const excedida = valor !== null && valor < 0

  return (
    <li
      style={{ '--tono': categoria.tono } as CSSProperties}
      className={`-mx-2 flex items-start gap-3.5 rounded-2xl px-2 py-3 ${resaltado}`}
    >
      <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tono)_15%,transparent)] text-(--tono)">
        <Icono size={19} aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[1rem] font-medium">{linea.categoria}</h3>
          {valor === null ? (
            <span className="shrink-0 text-[0.9rem] text-ink-3">Sin Presupuesto</span>
          ) : (
            <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{dinero(mostrado)}</span>
          )}
        </div>

        {valor !== null && <Medidor linea={linea} comprometido={comprometido} />}

        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[0.87rem] text-ink-3">
          <span className="tabular-nums">
            {linea.presupuesto === null
              ? `Gastado ${dinero(linea.gastado)}`
              : `Gastado ${dinero(linea.gastado)} de ${dinero(linea.presupuesto)}`}
          </span>
          {excedida ? (
            <span className="inline-flex items-center gap-1 font-medium text-critical">
              <CircleAlert size={14} aria-hidden="true" />
              Excedida
            </span>
          ) : (
            comprometido > 0 && <span className="tabular-nums">Comprometido {dinero(comprometido)}</span>
          )}
        </div>
      </div>
    </li>
  )
}

/** Cuánto queda por gastar en cada Categoría, descontando lo ya Comprometido. */
export function RestantePorCategoria() {
  const { estado, categoriaReciente, registros } = useDatos()
  const presupuestado = sumar(estado.presupuestos.map((linea) => linea.presupuesto ?? 0))

  return (
    <Tarjeta
      id="restante"
      titulo="Restante por Categoría"
      enlace={{ a: '/budgets', texto: 'Presupuestos' }}
    >
      <p className="mt-1 text-[0.95rem] text-ink-3">
        Gastado {dinero(gastosDelMes(estado))} de {dinero(presupuestado)} presupuestados
      </p>
      <ul className="mt-3">
        {estado.presupuestos.map((linea) => (
          <Fila
            key={linea.categoria}
            linea={linea}
            resaltado={
              linea.categoria === categoriaReciente
                ? registros % 2 === 0
                  ? 'fila-reciente-a'
                  : 'fila-reciente-b'
                : ''
            }
          />
        ))}
      </ul>
    </Tarjeta>
  )
}
