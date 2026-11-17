import { Repeat } from 'lucide-react'

/**
 * Said on the screens that change or delete an Expense born from a confirmed
 * RecurringPayment: the reservation stays resolved either way (docs/contratos.md).
 */
export function RecurringOriginNote({ change }: { change: 'edit' | 'delete' }) {
  return (
    <p className="mb-4 flex max-w-[34rem] items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem] text-ink-2">
      <Repeat size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        Este gasto viene de un pago recurrente confirmado.{' '}
        {change === 'edit' ? 'Cambiarlo' : 'Eliminarlo'} no reabre la reserva ni cambia su resolución.
      </span>
    </p>
  )
}
