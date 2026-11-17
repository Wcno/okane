import { Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { listAccounts } from '../accounts/api'
import { todayInPanama } from '../accounts/form'
import { useSignedInUser } from '../auth/context'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { ExpenseEditor } from '../components/expenses/ExpenseEditor'
import { Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { createExpense, lastUsedAccountId } from '../expenses/api'
import { announceExpenseChange } from '../expenses/changes'
import { chooseDefaultAccount } from '../expenses/form'
import { currentAccount, savedNotice } from '../expenses/notices'
import { offeredAccounts, type ExpensesNotice } from '../expenses/presentation'
import { useLoaded } from '../lib/useLoaded'

const BACK = { to: '/expenses', label: 'Gastos' }

/** Registers an Expense: amount, Category and Account; the date starts as today, the Account as the last one used. */
export function ExpenseCreate() {
  const { csrfToken } = useSignedInUser()
  const navigate = useNavigate()
  const today = todayInPanama()
  const { state, retry } = useLoaded(async () => {
    const [accounts, lastUsed] = await Promise.all([listAccounts(), lastUsedAccountId()])
    return { accounts: offeredAccounts(accounts), lastUsed }
  }, 'create')

  return (
    <>
      <ScreenHeader
        title="Nuevo gasto"
        back={BACK}
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
          onSaved={async (expense) => {
            const account = await currentAccount(expense.accountId)
            announceExpenseChange()
            const notice: ExpensesNotice = { notice: savedNotice('Registraste', expense, account) }
            navigate('/expenses', { state: notice })
          }}
          submitLabel="Registrar gasto"
          submittingLabel="Registrando…"
          cancelTo="/expenses"
        />
      )}
    </>
  )
}
