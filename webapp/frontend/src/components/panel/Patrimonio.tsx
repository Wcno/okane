import { TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { evolucion, hoy, patrimonio } from '../../data/sample'
import { dinero } from '../../lib/dinero'
import { useNumeroAnimado } from '../../lib/useNumeroAnimado'
import { useDatos } from '../../state/store'
import { GraficoPatrimonio, nombreDeMes } from './GraficoPatrimonio'
import { Tarjeta } from './Tarjeta'

type Vista = 'grafico' | 'tabla'

/**
 * La segunda respuesta del producto: cuánto varió el Patrimonio este mes y qué
 * parte se debe al Ahorro neto y cuál al Rendimiento.
 */
export function Patrimonio() {
  const { estado } = useDatos()
  const [vista, setVista] = useState<Vista>('grafico')
  const serie = evolucion(estado)
  const mesActual = serie[serie.length - 1]
  const variacion = Math.round((mesActual.ahorroNeto + mesActual.rendimiento) * 100) / 100
  const mostrado = useNumeroAnimado(patrimonio(estado))
  const Tendencia = variacion >= 0 ? TrendingUp : TrendingDown

  return (
    <Tarjeta id="patrimonio" titulo="Patrimonio">
      <p className="mt-1.5 text-[2.3rem] font-semibold leading-none tracking-[-0.03em]">
        {dinero(mostrado)}
      </p>

      <p
        className={`mt-3 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold ${
          variacion >= 0 ? 'text-good' : 'text-critical'
        }`}
      >
        <Tendencia size={17} aria-hidden="true" />
        <span className="tabular-nums">{dinero(variacion, { signo: true })}</span>
        <span className="font-medium text-ink-2">en lo que va de {hoy.mes}</span>
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 px-4 py-3">
          <dt className="text-[0.9rem] text-ink-2">Ahorro neto</dt>
          <dd className="mt-0.5 text-[1.15rem] font-semibold tabular-nums">
            {dinero(mesActual.ahorroNeto, { signo: true })}
          </dd>
          <dd className="mt-0.5 text-[0.82rem] leading-snug text-ink-3">Ingresos menos Gastos</dd>
        </div>
        <div className="rounded-2xl bg-surface-2 px-4 py-3">
          <dt className="text-[0.9rem] text-ink-2">Rendimiento</dt>
          <dd className="mt-0.5 text-[1.15rem] font-semibold tabular-nums">
            {dinero(mesActual.rendimiento, { signo: true })}
          </dd>
          <dd className="mt-0.5 text-[0.82rem] leading-snug text-ink-3">De tus inversiones</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="text-[0.95rem] font-medium">Evolución por mes</h3>
        <div role="group" aria-label="Forma de ver la evolución" className="flex rounded-full bg-surface-2 p-0.5">
          {(
            [
              ['grafico', 'Gráfico'],
              ['tabla', 'Tabla'],
            ] as const
          ).map(([opcion, texto]) => (
            <button
              key={opcion}
              type="button"
              aria-pressed={vista === opcion}
              onClick={() => setVista(opcion)}
              className={`h-7 rounded-full px-3 text-[0.85rem] transition-colors duration-150 ${
                vista === opcion
                  ? 'bg-surface font-semibold text-ink shadow-card'
                  : 'font-medium text-ink-2 hover:text-ink'
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {vista === 'grafico' ? (
        <GraficoPatrimonio serie={serie} />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[0.9rem]">
            <thead>
              <tr className="border-b border-line text-ink-3">
                <th scope="col" className="py-2 pr-3 text-left font-medium">
                  Mes
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Ahorro neto
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Rendimiento
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  Patrimonio
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {serie.map((punto, indice) => (
                <tr key={punto.mes} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {nombreDeMes[punto.mes]}
                  </th>
                  <td className="px-3 py-2 text-right text-ink-2">
                    {indice === 0 ? '' : dinero(punto.ahorroNeto, { signo: true })}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-2">
                    {indice === 0 ? '' : dinero(punto.rendimiento, { signo: true })}
                  </td>
                  <td className="py-2 pl-3 text-right font-semibold">{dinero(punto.patrimonio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  )
}
