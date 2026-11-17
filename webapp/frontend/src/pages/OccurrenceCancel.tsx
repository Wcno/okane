import { useSignedInUser } from '../auth/context'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { OneOccurrenceScreen } from '../components/recurringPayments/OneRecurringPaymentScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { categoryById } from '../data/categories'
import { cancelOccurrence, type RecurringPaymentOccurrence } from '../recurringPayments/api'
import { dueText, occurrenceTitle, recurringPaymentsBack, STATUS_LABELS } from '../recurringPayments/presentation'
import { useAfterRecurringPaymentChange } from '../recurringPayments/useAfterRecurringPaymentChange'

function Confirmation({ occurrence, name }: { occurrence: RecurringPaymentOccurrence; name: string }) {
  const { csrfToken } = useSignedInUser()
  const { afterCancellation } = useAfterRecurringPaymentChange()
  const isOpen = occurrence.status === 'pending' || occurrence.status === 'overdue'
  const category = categoryById(occurrence.categoryId).name

  return (
    <>
      <ScreenHeader title="Cancelar reserva" back={recurringPaymentsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<CategoryChip categoryId={occurrence.categoryId} />}
            title={name}
            details={isOpen ? `${category} · ${dueText(occurrence)}` : `${STATUS_LABELS[occurrence.status]} · ${category}`}
            amount={occurrence.amount}
          />
        }
        message={
          isOpen
            ? 'El dinero reservado queda libre y no se registra ningún gasto. Esta reserva ya no se podrá confirmar.'
            : occurrence.status === 'confirmed'
              ? 'Este pago ya se confirmó y su gasto está registrado. No se puede cancelar.'
              : 'Esta reserva ya estaba cancelada.'
        }
        cancel={{ to: recurringPaymentsBack.to, label: isOpen ? 'Volver' : 'Volver a pagos recurrentes' }}
        confirm={
          isOpen
            ? {
                label: 'Cancelar reserva',
                busyLabel: 'Cancelando…',
                run: () => cancelOccurrence(occurrence.id, csrfToken),
                onSaved: () => afterCancellation(name, occurrence.amount),
                failure: 'No pudimos cancelar la reserva. Inténtalo de nuevo.',
              }
            : undefined
        }
      />
    </>
  )
}

/** Releases a reservation without registering an Expense. */
export function OccurrenceCancel() {
  return (
    <OneOccurrenceScreen title="Cancelar reserva">
      {(occurrence) => <Confirmation key={occurrence.id} occurrence={occurrence} name={occurrenceTitle(occurrence)} />}
    </OneOccurrenceScreen>
  )
}
