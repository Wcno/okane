import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { getExpense, type Expense } from '../../expenses/api'
import { expensesBack } from '../../expenses/presentation'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const EXPENSE_ID = /^[1-9]\d{0,17}$/

function ExpenseNotHere() {
  return (
    <NotHere
      title="No encontramos este gasto"
      text="Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus gastos para elegirlo de la lista."
      back={expensesBack}
    />
  )
}

function LoadedExpense({
  expenseId,
  title,
  children,
}: {
  expenseId: number
  title: string
  children: (expense: Expense, accounts: Account[]) => ReactNode
}) {
  const { state, retry } = useLoaded(async () => {
    const [expense, accounts] = await Promise.all([getExpense(expenseId), listAccounts()])
    return { expense, accounts }
  }, expenseId)

  if (state.status === 'gone') return <ExpenseNotHere />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={expensesBack} />
        <Pending state={state} retry={retry} loading="Cargando el gasto…" />
      </>
    )
  }
  return <>{children(state.value.expense, state.value.accounts)}</>
}

/**
 * Frame of the screens that act on one Expense, named by the `:id` of the
 * route. A foreign, unknown or malformed id gets the same answer: the Expense is not here.
 */
export function OneExpenseScreen({
  title,
  children,
}: {
  title: string
  children: (expense: Expense, accounts: Account[]) => ReactNode
}) {
  const { id } = useParams()
  if (!EXPENSE_ID.test(id ?? '')) return <ExpenseNotHere />
  return (
    <LoadedExpense expenseId={Number(id)} title={title}>
      {children}
    </LoadedExpense>
  )
}
