import { useState } from 'react'
import type { Dashboard } from '../../dashboard/api'
import { formatMoney } from '../../lib/money'
import type { NetWorthPeriod } from '../../netWorth/api'
import { useNetWorthHistory } from '../../netWorth/useNetWorthHistory'
import { smallSecondaryButtonClassName } from '../buttons'
import { BigFigure } from './BigFigure'
import { Card } from './Card'
import { NetWorthChart } from './NetWorthChart'
import { NetWorthTable } from './NetWorthTable'

type View = 'chart' | 'table'

const VIEWS: { id: View; label: string }[] = [
  { id: 'chart', label: 'Gráfico' },
  { id: 'table', label: 'Tabla' },
]

/** The month's change split into what made it: the Ahorro neto, the Rendimiento and, apart, the Saldos iniciales that joined. */
function Breakdown({ period }: { period: NetWorthPeriod }) {
  const added = Number(period.openingBalancesAdded) !== 0
  return (
    <>
      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[0.95rem]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-2">Ahorro neto</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(period.netSavings)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-2">Rendimiento del período</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(period.periodReturn, { sign: true })}</dd>
        </div>
        {added && (
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
            <dt className="text-ink-2">Saldos iniciales incorporados</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(period.openingBalancesAdded, { sign: true })}</dd>
          </div>
        )}
      </dl>
      {added && (
        <p className="mt-2 text-[0.85rem] text-ink-3">
          Es dinero que ya tenías en Cuentas que empezaron este mes; no es ahorro ni ganancia.
        </p>
      )}
    </>
  )
}

/** Patrimonio today, how this month's change splits, and its monthly evolution as a chart or a table. */
export function NetWorthCard({ dashboard }: { dashboard: Dashboard }) {
  const { state, retry } = useNetWorthHistory()
  const [view, setView] = useState<View>('chart')
  const periods = state.status === 'ready' ? state.value : []
  const current = periods[periods.length - 1]

  return (
    <Card id="net-worth" title="Patrimonio" link={{ to: '/accounts', text: 'Cuentas' }}>
      <BigFigure amount={dashboard.netWorth} secondary />
      <p className="mt-3.5 text-ink-2">Tus Cuentas y tus inversiones al valor de hoy, también las archivadas.</p>

      {state.status === 'loading' && (
        <p role="status" className="mt-5 text-ink-3">
          Cargando la evolución…
        </p>
      )}
      {(state.status === 'failed' || state.status === 'gone') && (
        <div className="mt-5">
          <p className="text-ink-2">{state.message}</p>
          <button type="button" onClick={retry} className={`${smallSecondaryButtonClassName} mt-3`}>
            Reintentar
          </button>
        </div>
      )}
      {current && (
        <>
          <Breakdown period={current} />
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[0.95rem] font-medium text-ink-2">Evolución mensual</h3>
              <div className="flex gap-1.5" role="group" aria-label="Vista de la evolución">
                {VIEWS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={`${smallSecondaryButtonClassName} aria-pressed:border-ink aria-pressed:text-ink`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              {view === 'chart' ? <NetWorthChart periods={periods} /> : <NetWorthTable periods={periods} />}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
