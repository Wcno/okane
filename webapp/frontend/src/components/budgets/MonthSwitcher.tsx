import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { budgetsOf } from '../../budgets/presentation'
import { monthName, shiftMonth } from '../../lib/months'

const stepClassName =
  'grid size-[44px] place-items-center rounded-full border border-line-strong text-ink transition-colors duration-150 hover:bg-surface-2'

/** Moves the Budgets screen from month to month; past months stay reachable and editable. */
export function MonthSwitcher({ month, currentMonth }: { month: string; currentMonth: string }) {
  return (
    <nav aria-label="Mes de los Presupuestos" className="mb-4 flex max-w-[44rem] items-center gap-2 lg:mb-5">
      <Link to={budgetsOf(shiftMonth(month, -1))} aria-label="Mes anterior" className={stepClassName}>
        <ChevronLeft size={20} aria-hidden="true" />
      </Link>
      <p className="min-w-[10.5rem] flex-1 text-center text-[1.05rem] font-semibold" aria-live="polite">
        {monthName(month)}
      </p>
      <Link to={budgetsOf(shiftMonth(month, 1))} aria-label="Mes siguiente" className={stepClassName}>
        <ChevronRight size={20} aria-hidden="true" />
      </Link>
      {month !== currentMonth && (
        <Link
          to={budgetsOf(currentMonth)}
          className="inline-flex h-[44px] items-center rounded-full px-3 text-[0.95rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Mes actual
        </Link>
      )}
    </nav>
  )
}
