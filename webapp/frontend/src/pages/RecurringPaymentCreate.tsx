import { useAccounts } from '../accounts/useAccounts'
import { useSignedInUser } from '../auth/context'
import { RecurringPaymentEditor } from '../components/recurringPayments/RecurringPaymentEditor'
import { NeedsAnAccountCard } from '../components/record/NeedsAnAccount'
import { Pending, ScreenHeader } from '../components/screen/Screen'
import { offeredAccounts } from '../accounts/presentation'
import { todayInPanama } from '../lib/dates'
import { createRecurringPayment } from '../recurringPayments/api'
import {
  NEEDS_AN_ACCOUNT_FOR_RULES,
  recurringPaymentsBack,
  ruleTitle,
} from '../recurringPayments/presentation'
import { useAfterRecurringPaymentChange } from '../recurringPayments/useAfterRecurringPaymentChange'

/** Creates a rule: amount, Category, Account and the day of the month; it starts today. */
export function RecurringPaymentCreate() {
  const { csrfToken } = useSignedInUser()
  const { afterRuleChange } = useAfterRecurringPaymentChange()
  const { state, retry } = useAccounts()

  return (
    <>
      <ScreenHeader
        title="Nuevo pago recurrente"
        back={recurringPaymentsBack}
        intro="Cada mes se reserva este dinero, sin tocar tu Saldo, hasta que confirmes que lo pagaste."
      />
      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      ) : offeredAccounts(state.value).length === 0 ? (
        <NeedsAnAccountCard text={NEEDS_AN_ACCOUNT_FOR_RULES} />
      ) : (
        <RecurringPaymentEditor
          idPrefix="rule"
          initial={{
            description: '',
            amount: '',
            categoryId: null,
            accountId: offeredAccounts(state.value)[0].id,
            dayOfMonth: '',
            startDate: todayInPanama(),
          }}
          accounts={offeredAccounts(state.value)}
          save={(rule) => createRecurringPayment(rule, csrfToken)}
          onSaved={(rule) => afterRuleChange('created', ruleTitle(rule), rule.amount)}
          submitLabel="Crear pago recurrente"
          submittingLabel="Creando…"
        />
      )}
    </>
  )
}
