import type { Dashboard } from '../../dashboard/api'
import { formatMoney } from '../../lib/money'
import { sumAmounts } from '../../lib/decimal'
import type { RecurringPaymentOccurrence } from '../../recurringPayments/api'
import { dueText, occurrenceTitle } from '../../recurringPayments/presentation'
import { CategoryChip } from '../expenses/CategoryChip'
import { RecordRow } from '../screen/RecordRow'
import { Card } from './Card'

function Group({ title, occurrences }: { title: string; occurrences: RecurringPaymentOccurrence[] }) {
  if (occurrences.length === 0) return null
  return (
    <div className="mt-4 first:mt-3">
      <h3 className="flex items-baseline justify-between gap-3 text-[0.9rem] font-medium text-ink-2">
        <span>{title}</span>
        <span className="tabular-nums">{formatMoney(sumAmounts(occurrences.map((item) => item.amount)))}</span>
      </h3>
      <ul className="mt-1 divide-y divide-line">
        {occurrences.map((occurrence) => (
          <RecordRow
            key={occurrence.id}
            to={`/recurring-payments/occurrences/${occurrence.id}/confirm`}
            action="Revisar pago"
            icon={<CategoryChip categoryId={occurrence.categoryId} />}
            title={occurrenceTitle(occurrence)}
            details={dueText(occurrence)}
            amount={occurrence.amount}
          />
        ))}
      </ul>
    </div>
  )
}

/** What is still committed: payments overdue from earlier, apart from the ones of this month. */
export function UpcomingPaymentsCard({ overdue, upcoming }: Pick<Dashboard, 'overdue' | 'upcoming'>) {
  return (
    <Card id="committed" title="Comprometido" link={{ to: '/recurring-payments', text: 'Pagos recurrentes' }}>
      {overdue.length + upcoming.length === 0 ? (
        <p className="mt-2 max-w-[52ch] text-ink-2">No tienes pagos pendientes de confirmar.</p>
      ) : (
        <>
          <Group title="Vencidos" occurrences={overdue} />
          <Group title="Del mes" occurrences={upcoming} />
        </>
      )}
    </Card>
  )
}
