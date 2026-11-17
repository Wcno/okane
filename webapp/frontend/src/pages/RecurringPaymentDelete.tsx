import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { OneRecurringPaymentScreen } from '../components/recurringPayments/OneRecurringPaymentScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { deleteRecurringPayment, type RecurringPayment } from '../recurringPayments/api'
import { describeRule, recurringPaymentsBack, ruleTitle } from '../recurringPayments/presentation'
import { useAfterRecurringPaymentChange } from '../recurringPayments/useAfterRecurringPaymentChange'

function Confirmation({ rule, accounts }: { rule: RecurringPayment; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const { afterRuleChange } = useAfterRecurringPaymentChange()
  const account = accounts.find((candidate) => candidate.id === rule.accountId)
  const { title, details } = describeRule(rule, account?.name)

  return (
    <>
      <ScreenHeader title="Eliminar pago recurrente" back={recurringPaymentsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<CategoryChip categoryId={rule.categoryId} />}
            title={title}
            details={details}
            amount={rule.amount}
          />
        }
        message="Dejará de reservarse dinero en los meses que vienen. Las reservas que ya existen, pendientes o resueltas, y los gastos ya confirmados se conservan."
        cancel={{ to: '/recurring-payments', label: 'Cancelar' }}
        confirm={{
          label: 'Eliminar pago recurrente',
          busyLabel: 'Eliminando…',
          run: () => deleteRecurringPayment(rule.id, csrfToken),
          onSaved: () => afterRuleChange('deleted', ruleTitle(rule), rule.amount),
          failure: 'No pudimos eliminar el pago recurrente. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Deletes a rule on its own screen, saying first what is kept. */
export function RecurringPaymentDelete() {
  return (
    <OneRecurringPaymentScreen title="Eliminar pago recurrente">
      {(rule, accounts) => <Confirmation rule={rule} accounts={accounts} />}
    </OneRecurringPaymentScreen>
  )
}
