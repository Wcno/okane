import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { NotFoundError } from '../../lib/http'
import { useLoaded } from '../../lib/useLoaded'
import {
  getOccurrence,
  getRecurringPayment,
  type RecurringPaymentOccurrence,
} from '../../recurringPayments/api'
import { recurringPaymentsBack, ruleTitle } from '../../recurringPayments/presentation'
import { categoryById } from '../../data/categories'
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

/** The rule's name for an occurrence; an occurrence outlives its deleted rule, so it falls back to the Category. */
async function titleOf(occurrence: RecurringPaymentOccurrence): Promise<string> {
  try {
    return ruleTitle(await getRecurringPayment(occurrence.recurringPaymentId))
  } catch (error) {
    if (error instanceof NotFoundError) return categoryById(occurrence.categoryId).name
    throw error
  }
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
    const occurrence = await getOccurrence(occurrenceId)
    const [accounts, name] = await Promise.all([listAccounts(), titleOf(occurrence)])
    return { occurrence, accounts, name }
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
