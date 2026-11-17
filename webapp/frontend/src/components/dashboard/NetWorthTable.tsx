import { formatMoney } from '../../lib/money'
import { monthName } from '../../lib/months'
import type { NetWorthPeriod } from '../../netWorth/api'

/** The same series as the chart, newest month first, with the three parts of each change in their own columns. */
export function NetWorthTable({ periods }: { periods: NetWorthPeriod[] }) {
  const newestFirst = [...periods].reverse()
  return (
    <div
      role="region"
      aria-label="Evolución mensual del Patrimonio en tabla"
      tabIndex={0}
      className="max-h-80 overflow-auto"
    >
      <table className="w-full min-w-[34rem] text-left text-[0.9rem]">
        <caption className="sr-only">
          Patrimonio al cierre de cada mes y de dónde vino su cambio: Saldos iniciales incorporados, Ahorro neto y
          Rendimiento del período.
        </caption>
        <thead>
          <tr className="border-b border-line text-ink-3">
            <th scope="col" className="py-2 pr-3 font-medium">
              Mes
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Patrimonio
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Saldos iniciales
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Ahorro neto
            </th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">
              Rendimiento
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {newestFirst.map((period) => (
            <tr key={period.month}>
              <th scope="row" className="py-2 pr-3 font-medium">
                {monthName(period.month)}
                {period.estimated && <span className="ml-1.5 font-normal text-ink-3">(estimado)</span>}
              </th>
              <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatMoney(period.netWorth)}</td>
              <td className="px-2 py-2 text-right tabular-nums text-ink-2">
                {formatMoney(period.openingBalancesAdded, { sign: true })}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-ink-2">
                {formatMoney(period.netSavings)}
              </td>
              <td className="py-2 pl-2 text-right tabular-nums text-ink-2">
                {formatMoney(period.periodReturn, { sign: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
