import { formatMoney } from '../../lib/money'
import { monthName } from '../../lib/months'
import type { NetWorthPeriod } from '../../netWorth/api'

function Figure({ label, amount, strong = false }: { label: string; amount: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold' : 'text-ink-2'}`}>{amount}</dd>
    </div>
  )
}

/**
 * The same series as the chart, newest month first. Each month is a block of label and
 * amount pairs, so a phone shows every figure without scrolling sideways.
 */
export function NetWorthTable({ periods }: { periods: NetWorthPeriod[] }) {
  return (
    <section
      aria-label="Evolución mensual del Patrimonio en tabla"
      className="max-h-96 overflow-y-auto focus-visible:outline-2 focus-visible:outline-ink"
      tabIndex={0}
    >
      <ul className="divide-y divide-line">
        {[...periods].reverse().map((period) => (
          <li key={period.month} className="py-3 first:pt-0">
            <h4 className="font-medium">
              {monthName(period.month)}
              {period.estimated && <span className="ml-1.5 font-normal text-ink-3">(estimado)</span>}
            </h4>
            <dl className="mt-1.5 space-y-1 text-[0.9rem]">
              <Figure label="Patrimonio" amount={formatMoney(period.netWorth)} strong />
              <Figure label="Saldos iniciales" amount={formatMoney(period.openingBalancesAdded, { sign: true })} />
              <Figure label="Ahorro neto" amount={formatMoney(period.netSavings)} />
              <Figure label="Rendimiento" amount={formatMoney(period.periodReturn, { sign: true })} />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  )
}
