import { Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listAccounts } from '../accounts/api'
import { todayInPanama } from '../accounts/form'
import { useSignedInUser } from '../auth/context'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { ExpenseEditor } from '../components/expenses/ExpenseEditor'
import { Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { createExpense, lastUsedAccountId } from '../expenses/api'
import { chooseDefaultAccount } from '../expenses/form'
import { expensesBack, offeredAccounts } from '../expenses/presentation'
import { useAfterExpenseChange } from '../expenses/useAfterExpenseChange'
import { useLoaded } from '../lib/useLoaded'

/** Registers an Expense: amount, Category and Account; the date starts as today, the Account as the last one used. */
export function ExpenseCreate() {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterExpenseChange()
  const today = todayInPanama()
  const { state, retry } = useLoaded(async () => {
    const [accounts, lastUsed] = await Promise.all([listAccounts(), lastUsedAccountId()])
    return { accounts: offeredAccounts(accounts), lastUsed }
  })

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
        <section className={`${cardClassName} max-w-[34rem]`}>
          <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[1.2rem] font-semibold tracking-[-0.01em]">Primero necesitas una Cuenta</h2>
          <p className="mt-2 text-ink-2">
            Un gasto sale de una Cuenta de gastos o de ahorro. Crea la que usas para pagar y vuelve aquí.
          </p>
          <Link to="/accounts/create" className={`${smallSecondaryButtonClassName} mt-5`}>
            Crear cuenta
          </Link>
        </section>
      ) : (
        <ExpenseEditor
          idPrefix="expense"
          initial={{
            amount: '',
            categoryId: null,
            accountId: chooseDefaultAccount(state.value.accounts, state.value.lastUsed),
            date: today,
            description: '',
          }}
          accounts={state.value.accounts}
          today={today}
          save={(expense) => createExpense(expense, csrfToken)}
          onSaved={(expense) => afterChange('Registraste', expense)}
          submitLabel="Registrar gasto"
          submittingLabel="Registrando…"
          cancelTo="/expenses"
        />
      )}
    </>
  )
}
