import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { OneRecurringPaymentScreen } from '../components/recurringPayments/OneRecurringPaymentScreen'
import { RecurringPaymentEditor } from '../components/recurringPayments/RecurringPaymentEditor'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'
import { offeredAccounts } from '../accounts/presentation'
import { updateRecurringPayment, type RecurringPayment } from '../recurringPayments/api'
import { recurringPaymentsBack, ruleTitle } from '../recurringPayments/presentation'
import { useAfterRecurringPaymentChange } from '../recurringPayments/useAfterRecurringPaymentChange'

function EditForm({ rule, accounts }: { rule: RecurringPayment; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const { afterRuleChange } = useAfterRecurringPaymentChange()
  const current = accounts.find((account) => account.id === rule.accountId)
  const isOnArchivedAccount = current !== undefined && current.archivedAt !== null

  return (
    <>
      <ScreenHeader
        title="Editar pago recurrente"
        back={recurringPaymentsBack}
        intro="Los cambios valen para las reservas que aún no se crearon. Las que ya existen no cambian."
      />
      <RecurringPaymentEditor
        idPrefix="rule"
        initial={{
          description: rule.description,
          amount: rule.amount,
          categoryId: rule.categoryId,
          accountId: rule.accountId,
          dayOfMonth: String(rule.dayOfMonth),
          startDate: rule.startDate,
        }}
        accounts={offeredAccounts(accounts, rule.accountId)}
        save={(input) => updateRecurringPayment(rule.id, input, csrfToken)}
        onSaved={(saved) => afterRuleChange('updated', ruleTitle(saved), saved.amount)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        accountNote={
          isOnArchivedAccount
            ? 'Esta Cuenta está archivada. Elige otra Cuenta para que el pago siga reservándose.'
            : undefined
        }
      >
        <DeleteLink to={`/recurring-payments/${rule.id}/delete`}>Eliminar este pago recurrente</DeleteLink>
      </RecurringPaymentEditor>
    </>
  )
}

/** Corrects a rule: any field. Only the reservations not yet created follow. */
export function RecurringPaymentEdit() {
  return (
    <OneRecurringPaymentScreen title="Editar pago recurrente">
      {(rule, accounts) => <EditForm key={rule.id} rule={rule} accounts={accounts} />}
    </OneRecurringPaymentScreen>
  )
}
