import type { ReactNode } from 'react'
import { listAccounts, type Account } from '../../accounts/api'
import { getExpense, type Expense } from '../../expenses/api'
import { expensesBack } from '../../expenses/presentation'
import { OneRecordScreen } from '../screen/OneRecordScreen'

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
  return (
    <OneRecordScreen
      title={title}
      back={expensesBack}
      notHere={{
        title: 'No encontramos este gasto',
        text: 'Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus gastos para elegirlo de la lista.',
      }}
      loading="Cargando el gasto…"
      load={async (id) => {
        const [expense, accounts] = await Promise.all([getExpense(id), listAccounts()])
        return { expense, accounts }
      }}
    >
      {({ expense, accounts }) => children(expense, accounts)}
    </OneRecordScreen>
  )
}
