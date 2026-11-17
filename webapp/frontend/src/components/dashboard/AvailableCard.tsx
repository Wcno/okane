import { toCents } from '../../lib/decimal'
import type { Dashboard } from '../../dashboard/api'
import { percentOf, perDaySentence } from '../../dashboard/presentation'
import { formatMoney } from '../../lib/money'
import { BigFigure } from './BigFigure'
import { Card } from './Card'

/** The first product answer: available spending through month end, with its breakdown. */
export function AvailableCard({ dashboard }: { dashboard: Dashboard }) {
  const { available, spendingBalance, committed, committedCount } = dashboard
  const availablePart = toCents(available) > 0n ? available : '0.00'

  return (
    <Card title="Disponible hasta fin de mes" id="available">
      <BigFigure amount={available} />

      <p className="mt-3.5 max-w-[46ch] text-ink-2">{perDaySentence(dashboard)}</p>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-4 text-[0.95rem]">
          <span className="text-ink-2">Saldo en Cuentas de gastos</span>
          <span className="font-semibold tabular-nums">{formatMoney(spendingBalance)}</span>
        </div>

        <div
          className="mt-3 flex h-2 gap-0.5"
          role="img"
          aria-label={`Del Saldo en Cuentas de gastos, ${formatMoney(available)} están disponibles y ${formatMoney(committed)} comprometidos.`}
        >
          <span
            className="rounded-full bg-ink transition-[flex-grow] duration-500 ease-out-quart"
            style={{ flexGrow: percentOf(availablePart, spendingBalance), flexBasis: 0 }}
          />
          <span
            className="rounded-full bg-ink/30"
            style={{ flexGrow: percentOf(committed, spendingBalance), flexBasis: 0 }}
          />
        </div>

        <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-2 text-[0.95rem]">
          <div className="flex items-baseline gap-2">
            <span className="size-2.5 translate-y-px rounded-full bg-ink" aria-hidden="true" />
            <dt className="text-ink-2">Disponible</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(available)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="size-2.5 translate-y-px rounded-full bg-ink/30" aria-hidden="true" />
            <dt className="text-ink-2">
              {committedCount === 1 ? 'Comprometido en 1 pago' : `Comprometido en ${committedCount} pagos`}
            </dt>
            <dd className="font-semibold tabular-nums">{formatMoney(committed)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
