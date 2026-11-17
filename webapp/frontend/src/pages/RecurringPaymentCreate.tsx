import { Wallet } from 'lucide-react'
import { useAccounts } from '../accounts/useAccounts'
import { useSignedInUser } from '../auth/context'
import { RecurringPaymentEditor } from '../components/recurringPayments/RecurringPaymentEditor'
import { Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { Link } from 'react-router-dom'
import { primaryButtonClassName } from '../components/buttons'
import { offeredAccounts } from '../expenses/presentation'
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
        <section className={`${cardClassName} max-w-[34rem]`}>
          <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <h2 className="mt-4 mb-2 text-[1.2rem] font-semibold tracking-[-0.01em]">Primero necesitas una Cuenta</h2>
          <p className="text-ink-2">{NEEDS_AN_ACCOUNT_FOR_RULES}</p>
          <Link to="/accounts/create" className={`${primaryButtonClassName} mt-4`}>
            Crear cuenta
          </Link>
        </section>
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
          cancelTo="/recurring-payments"
        />
      )}
    </>
  )
}
