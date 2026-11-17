import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { listAccounts, type Account } from '../../accounts/api'
import { getExpense, type Expense } from '../../expenses/api'
import { NotFoundError } from '../../lib/http'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const BACK = { to: '/expenses', label: 'Gastos' }

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
  const { state, retry } = useLoaded(async () => {
    if (!/^[1-9]\d{0,17}$/.test(id ?? '')) throw new NotFoundError('')
    const [expense, accounts] = await Promise.all([getExpense(Number(id)), listAccounts()])
    return { expense, accounts }
  }, id)

  if (state.status === 'gone') {
    return (
      <NotHere
        title="No encontramos este gasto"
        text="Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus gastos para elegirlo de la lista."
        back={{ to: BACK.to, label: 'Volver a Gastos' }}
      />
    )
  }
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={BACK} />
        <Pending state={state} retry={retry} loading="Cargando el gasto…" />
      </>
    )
  }
  return <>{children(state.value.expense, state.value.accounts)}</>
}
