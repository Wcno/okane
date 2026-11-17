import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import {
  getOccurrence,
  getRecurringPayment,
  type RecurringPayment,
  type RecurringPaymentOccurrence,
} from '../../recurringPayments/api'
import { recurringPaymentsBack } from '../../recurringPayments/presentation'
import { OneRecordScreen, type OneRecordWording } from '../record/OneRecordScreen'

const ruleWording: OneRecordWording = {
  back: recurringPaymentsBack,
  loading: 'Cargando el pago recurrente…',
  notHere: {
    title: 'No encontramos este pago recurrente',
    text: 'Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus pagos recurrentes para elegirlo de la lista.',
  },
}

const occurrenceWording: OneRecordWording = {
  back: recurringPaymentsBack,
  loading: 'Cargando la reserva…',
  notHere: {
    title: 'No encontramos esta reserva',
    text: 'Puede que la dirección esté incompleta o que la reserva ya no exista. Vuelve a tus pagos recurrentes para elegirla de la lista.',
  },
}

/** Frame of the screens that act on one rule, named by the `:id` of the route. */
export function OneRecurringPaymentScreen({
  title,
  children,
}: {
  title: string
  children: (rule: RecurringPayment, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen title={title} load={getRecurringPayment} wording={ruleWording}>
      {children}
    </OneRecordScreen>
  )
}

/** Frame of the screens that act on one occurrence (a month's reservation), named by the `:id` of the route. */
export function OneOccurrenceScreen({
  title,
  children,
}: {
  title: string
  children: (occurrence: RecurringPaymentOccurrence, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen title={title} load={getOccurrence} wording={occurrenceWording}>
      {children}
    </OneRecordScreen>
  )
}
