import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { useLoaded } from '../../lib/useLoaded'
import { getOccurrence, type RecurringPaymentOccurrence } from '../../recurringPayments/api'
import { occurrenceTitle, recurringPaymentsBack } from '../../recurringPayments/presentation'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const RECORD_ID = /^[1-9]\d{0,17}$/

function OccurrenceNotHere() {
  return (
    <NotHere
      title="No encontramos esta reserva"
      text="Puede que la dirección esté incompleta o que la reserva ya no exista. Vuelve a tus pagos recurrentes para elegirla de la lista."
      back={recurringPaymentsBack}
    />
  )
}

function LoadedOccurrence({
  occurrenceId,
  title,
  children,
}: {
  occurrenceId: number
  title: string
  children: (occurrence: RecurringPaymentOccurrence, accounts: Account[], name: string) => ReactNode
}) {
  const { state, retry } = useLoaded(async () => {
    const [occurrence, accounts] = await Promise.all([getOccurrence(occurrenceId), listAccounts()])
    return { occurrence, accounts, name: occurrenceTitle(occurrence) }
  }, occurrenceId)

  if (state.status === 'gone') return <OccurrenceNotHere />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={recurringPaymentsBack} />
        <Pending state={state} retry={retry} loading="Cargando la reserva…" />
      </>
    )
  }
  return <>{children(state.value.occurrence, state.value.accounts, state.value.name)}</>
}

/**
 * Frame of the screens that act on one occurrence, named by the `:id` of the
 * route. A foreign, unknown or malformed id gets the same answer: it is not here.
 */
export function OneOccurrenceScreen({
  title,
  children,
}: {
  title: string
  children: (occurrence: RecurringPaymentOccurrence, accounts: Account[], name: string) => ReactNode
}) {
  const { id } = useParams()
  if (!RECORD_ID.test(id ?? '')) return <OccurrenceNotHere />
  return (
    <LoadedOccurrence occurrenceId={Number(id)} title={title}>
      {children}
    </LoadedOccurrence>
  )
}
