import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { useLoaded } from '../../lib/useLoaded'
import { getRecurringPayment, type RecurringPayment } from '../../recurringPayments/api'
import { recurringPaymentsBack } from '../../recurringPayments/presentation'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const RECORD_ID = /^[1-9]\d{0,17}$/

function RuleNotHere() {
  return (
    <NotHere
      title="No encontramos este pago recurrente"
      text="Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus pagos recurrentes para elegirlo de la lista."
      back={recurringPaymentsBack}
    />
  )
}

function LoadedRule({
  ruleId,
  title,
  children,
}: {
  ruleId: number
  title: string
  children: (rule: RecurringPayment, accounts: Account[]) => ReactNode
}) {
  const { state, retry } = useLoaded(async () => {
    const [rule, accounts] = await Promise.all([getRecurringPayment(ruleId), listAccounts()])
    return { rule, accounts }
  }, ruleId)

  if (state.status === 'gone') return <RuleNotHere />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={recurringPaymentsBack} />
        <Pending state={state} retry={retry} loading="Cargando el pago recurrente…" />
      </>
    )
  }
  return <>{children(state.value.rule, state.value.accounts)}</>
}

/**
 * Frame of the screens that act on one rule, named by the `:id` of the route.
 * A foreign, unknown or malformed id gets the same answer: the rule is not here.
 */
export function OneRecurringPaymentScreen({
  title,
  children,
}: {
  title: string
  children: (rule: RecurringPayment, accounts: Account[]) => ReactNode
}) {
  const { id } = useParams()
  if (!RECORD_ID.test(id ?? '')) return <RuleNotHere />
  return (
    <LoadedRule ruleId={Number(id)} title={title}>
      {children}
    </LoadedRule>
  )
}
