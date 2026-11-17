import {
  committed,
  remainingDays,
  disponible,
  today,
  upcomingPayments,
  spendingAccountBalance,
} from '../../data/sample'
import { formatMoney, moneyParts } from '../../lib/money'
import { useAnimatedNumber } from '../../lib/useAnimatedNumber'
import { useData } from '../../state/context'
import { Card } from './Card'

/** The first product answer: available spending through month end, with its breakdown. */
export function AvailableCard() {
  const { state } = useData()
  const value = disponible(state)
  const balance = spendingAccountBalance(state)
  const displayed = useAnimatedNumber(value)
  const { sign, integer, cents } = moneyParts(displayed)
  const perDay = value > 0 ? value / remainingDays : 0

  return (
    <Card title="Disponible hasta fin de mes" id="available">
      <p className="mt-2 text-[3.2rem] font-semibold leading-none tracking-[-0.035em] lg:text-[4.25rem]">
        <span aria-hidden="true">
          {sign}
          <span className="mr-0.5 text-[0.62em] font-medium text-ink-3">$</span>
          {integer}
          <span className="text-[0.5em] font-medium tracking-[-0.01em] text-ink-2">.{cents}</span>
        </span>
        <span className="sr-only">{formatMoney(value)}</span>
      </p>

      <p className="mt-3.5 max-w-[46ch] text-ink-2">
        {value > 0 ? (
          <>
            Son <strong className="font-semibold text-ink">{formatMoney(perDay)} por día</strong> durante
            los {remainingDays} días que quedan de {today.month}.
          </>
        ) : (
          <>
            Lo Comprometido supera el Saldo de tus Cuentas de gastos. Quedan {remainingDays} días de{' '}
            {today.month}.
          </>
        )}
      </p>

      <div className="mt-7 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-4 text-[0.95rem]">
          <span className="text-ink-2">Saldo en Cuentas de gastos</span>
          <span className="font-semibold tabular-nums">{formatMoney(balance)}</span>
        </div>

        <div
          className="mt-3 flex h-2 gap-0.5"
          role="img"
          aria-label={`Del Saldo en Cuentas de gastos, ${formatMoney(value)} están disponibles y ${formatMoney(committed)} comprometidos.`}
        >
          <span
            className="rounded-full bg-ink transition-[flex-grow] duration-500 ease-out-quart"
            style={{ flexGrow: Math.max(value, 0), flexBasis: 0 }}
          />
          <span className="rounded-full bg-ink/30" style={{ flexGrow: committed, flexBasis: 0 }} />
        </div>

        <dl className="mt-3.5 flex flex-wrap gap-x-8 gap-y-2 text-[0.95rem]">
          <div className="flex items-baseline gap-2">
            <span className="size-2.5 translate-y-px rounded-full bg-ink" aria-hidden="true" />
            <dt className="text-ink-2">Disponible</dt>
            <dd className="font-semibold tabular-nums">{formatMoney(value)}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="size-2.5 translate-y-px rounded-full bg-ink/30" aria-hidden="true" />
            <dt className="text-ink-2">
              Comprometido en {upcomingPayments.length} pagos
            </dt>
            <dd className="font-semibold tabular-nums">{formatMoney(committed)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
