import { TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { netWorthHistory, today, netWorth } from '../../data/sample'
import { formatMoney } from '../../lib/money'
import { useAnimatedNumber } from '../../lib/useAnimatedNumber'
import { useData } from '../../state/context'
import { NetWorthChart } from './NetWorthChart'
import { monthNames } from '../../data/months'
import { Card } from './Card'

type View = 'chart' | 'table'

/** The second product answer: monthly Net Worth change, split into Net Savings and Investment Return. */
export function NetWorthCard() {
  const { state } = useData()
  const [view, setView] = useState<View>('chart')
  const series = netWorthHistory(state)
  const currentMonth = series[series.length - 1]
  const change = Math.round((currentMonth.netSavings + currentMonth.investmentReturn) * 100) / 100
  const displayed = useAnimatedNumber(netWorth(state))
  const Trend = change >= 0 ? TrendingUp : TrendingDown

  return (
    <Card id="net-worth" title="Patrimonio">
      <p className="mt-1.5 text-[2.3rem] font-semibold leading-none tracking-[-0.03em]">
        {formatMoney(displayed)}
      </p>

      <p
        className={`mt-3 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold ${
          change >= 0 ? 'text-good' : 'text-critical'
        }`}
      >
        <Trend size={17} aria-hidden="true" />
        <span className="tabular-nums">{formatMoney(change, { sign: true })}</span>
        <span className="font-medium text-ink-2">en lo que va de {today.month}</span>
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-2 px-4 py-3">
          <dt className="text-[0.9rem] text-ink-2">Ahorro neto</dt>
          <dd className="mt-0.5 text-[1.15rem] font-semibold tabular-nums">
            {formatMoney(currentMonth.netSavings, { sign: true })}
          </dd>
          <dd className="mt-0.5 text-[0.82rem] leading-snug text-ink-3">Ingresos menos Gastos</dd>
        </div>
        <div className="rounded-2xl bg-surface-2 px-4 py-3">
          <dt className="text-[0.9rem] text-ink-2">Rendimiento</dt>
          <dd className="mt-0.5 text-[1.15rem] font-semibold tabular-nums">
            {formatMoney(currentMonth.investmentReturn, { sign: true })}
          </dd>
          <dd className="mt-0.5 text-[0.82rem] leading-snug text-ink-3">De tus inversiones</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h3 className="text-[0.95rem] font-medium">Evolución por mes</h3>
        <div role="group" aria-label="Forma de ver la evolución" className="flex rounded-full bg-surface-2 p-0.5">
          {(
            [
              ['chart', 'Gráfico'],
              ['table', 'Tabla'],
            ] as const
          ).map(([option, text]) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={`h-7 rounded-full px-3 text-[0.85rem] transition-colors duration-150 ${
                view === option
                  ? 'bg-surface font-semibold text-ink shadow-card'
                  : 'font-medium text-ink-2 hover:text-ink'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' ? (
        <NetWorthChart series={series} />
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
              {series.map((point, index) => (
                <tr key={point.month} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {monthNames[point.month]}
                  </th>
                  <td className="px-3 py-2 text-right text-ink-2">
                    {index === 0 ? '' : formatMoney(point.netSavings, { sign: true })}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-2">
                    {index === 0 ? '' : formatMoney(point.investmentReturn, { sign: true })}
                  </td>
                  <td className="py-2 pl-3 text-right font-semibold">{formatMoney(point.netWorth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
