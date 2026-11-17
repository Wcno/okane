import { useSignedInUser } from '../auth/context'
import { ExpenseEditor } from '../components/expenses/ExpenseEditor'
import { NeedsAnAccountCard } from '../components/record/NeedsAnAccount'
import { Pending, ScreenHeader } from '../components/screen/Screen'
import { createExpense } from '../expenses/api'
import { chooseDefaultAccount } from '../expenses/form'
import { NEEDS_AN_ACCOUNT, expensesBack } from '../expenses/presentation'
import { useAfterExpenseChange } from '../expenses/useAfterExpenseChange'
import { useExpenseAccounts } from '../expenses/useExpenseAccounts'
import { todayInPanama } from '../lib/dates'

/** Registers an Expense: amount, Category and Account; the date starts as today, the Account as the last one used. */
export function ExpenseCreate() {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterExpenseChange()
  const { state, retry } = useExpenseAccounts()

  return (
    <>
      <ScreenHeader
        title="Nuevo gasto"
        back={expensesBack}
        intro="Anota lo que gastaste. Se descuenta del Saldo de la Cuenta, aunque la deje en negativo."
      />
      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      ) : state.value.accounts.length === 0 ? (
        <NeedsAnAccountCard text={NEEDS_AN_ACCOUNT} />
      ) : (
        <ExpenseEditor
          idPrefix="expense"
          initial={{
            amount: '',
            categoryId: null,
            accountId: chooseDefaultAccount(state.value.accounts, state.value.lastUsed),
            date: todayInPanama(),
            description: '',
          }}
          accounts={state.value.accounts}
          save={(expense) => createExpense(expense, csrfToken)}
          onSaved={(expense) => afterChange('created', expense)}
          submitLabel="Registrar gasto"
          submittingLabel="Registrando…"
          cancelTo="/expenses"
        />
      )}
    </>
  )
}
