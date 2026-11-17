import type { CSSProperties } from 'react'
import { categoryByName } from '../../categories/catalog'
import { committed, today, upcomingPayments } from '../../data/sample'
import { formatMoney } from '../../lib/money'
import { Card } from './Card'

const dueIn = (day: number) => {
  const days = day - today.day
  return days === 1 ? 'Mañana' : `En ${days} días`
}

/** Upcoming monthly Recurring Payments make up the committed amount. */
export function UpcomingPaymentsCard() {
  return (
    <Card
      id="payments"
      title="Pagos recurrentes por vencer"
      link={{ to: '/recurring-payments', text: 'Ver todos' }}
    >
      <p className="mt-1 text-[0.95rem] text-ink-3">
        Comprometido {formatMoney(committed)} hasta fin de mes
      </p>

      {upcomingPayments.length === 0 ? (
        <p className="mt-4 text-ink-2">
          No queda ningún Pago recurrente por vencer este mes. Todo el Saldo de tus Cuentas de
          gastos está disponible.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {upcomingPayments.map((payment) => {
            const category = categoryByName(payment.category)
            return (
              <li
                key={payment.id}
                style={{ '--tone': category.tone } as CSSProperties}
                className="flex items-center gap-3.5 py-3 first:pt-1 last:pb-0"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-center leading-none">
                  <div>
                    <div className="text-[1.05rem] font-semibold tabular-nums">{payment.day}</div>
                    <div className="mt-0.5 text-[0.72rem] text-ink-3">{today.shortMonth}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[1rem] font-medium">{payment.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[0.87rem] text-ink-3">
                    <span className="size-2 shrink-0 rounded-full bg-(--tone)" aria-hidden="true" />
                    <span className="truncate">
                      {payment.category} · {dueIn(payment.day)}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-[1rem] font-semibold tabular-nums">
                  {formatMoney(payment.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
