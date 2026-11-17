import type { Dashboard } from '../../dashboard/api'
import { formatMoney } from '../../lib/money'
import { BigFigure } from './BigFigure'
import { Card } from './Card'

/**
 * Patrimonio today and the month's Ahorro neto. Rendimiento and the monthly
 * evolution wait for investments (#13, #24); nothing stands in for them.
 */
export function NetWorthCard({ dashboard }: { dashboard: Dashboard }) {
  return (
    <Card id="net-worth" title="Patrimonio" link={{ to: '/accounts', text: 'Cuentas' }}>
      <BigFigure amount={dashboard.netWorth} secondary />
      <p className="mt-3.5 text-ink-2">La suma de los Saldos de todas tus Cuentas, también las archivadas.</p>

      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[0.95rem]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-2">Ingresos del mes</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(dashboard.income)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-2">Gastos del mes</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(dashboard.expenses)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
          <dt className="font-medium">Ahorro neto</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(dashboard.netSavings)}</dd>
        </div>
      </dl>
    </Card>
  )
}
