import { useSignedInUser } from '../auth/context'
import { IncomeEditor } from '../components/incomes/IncomeEditor'
import { NeedsAnAccountCard } from '../components/record/NeedsAnAccount'
import { Pending, ScreenHeader } from '../components/screen/Screen'
import { createIncome } from '../incomes/api'
import { defaultAccountId } from '../incomes/form'
import { NEEDS_AN_ACCOUNT_FOR_INCOME, incomesBack } from '../incomes/presentation'
import { useAfterIncomeChange } from '../incomes/useAfterIncomeChange'
import { useIncomeAccounts } from '../incomes/useIncomeAccounts'
import { todayInPanama } from '../lib/dates'

/** Registers an Income: amount and Account; the date starts as today. */
export function IncomeCreate() {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterIncomeChange()
  const { state, retry } = useIncomeAccounts()

  return (
    <>
      <ScreenHeader
        title="Nuevo ingreso"
        back={incomesBack}
        intro="Anota el dinero que recibiste. Se suma al Saldo de la Cuenta."
      />
      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      ) : state.value.length === 0 ? (
        <NeedsAnAccountCard text={NEEDS_AN_ACCOUNT_FOR_INCOME} />
      ) : (
        <IncomeEditor
          initial={{ amount: '', accountId: defaultAccountId(state.value), date: todayInPanama(), description: '' }}
          accounts={state.value}
          save={(income) => createIncome(income, csrfToken)}
          onSaved={(income) => afterChange('created', income)}
          submitLabel="Registrar ingreso"
          submittingLabel="Registrando…"
        />
      )}
    </>
  )
}
