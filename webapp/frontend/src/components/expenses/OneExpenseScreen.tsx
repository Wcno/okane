import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import { getExpense, type Expense } from '../../expenses/api'
import { expensesBack } from '../../expenses/presentation'
import { OneRecordScreen, type OneRecordWording } from '../record/OneRecordScreen'

const wording: OneRecordWording = {
  back: expensesBack,
  loading: 'Cargando el gasto…',
  notHere: {
    title: 'No encontramos este gasto',
    text: 'Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus gastos para elegirlo de la lista.',
  },
}

/** Frame of the screens that act on one Expense, named by the `:id` of the route. */
export function OneExpenseScreen({
  title,
  children,
}: {
  title: string
  children: (expense: Expense, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen title={title} load={getExpense} wording={wording}>
      {children}
    </OneRecordScreen>
  )
}
