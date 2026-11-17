import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import { getIncome, type Income } from '../../incomes/api'
import { incomesBack } from '../../incomes/presentation'
import { OneRecordScreen, type OneRecordWording } from '../record/OneRecordScreen'

const wording: OneRecordWording = {
  back: incomesBack,
  loading: 'Cargando el ingreso…',
  notHere: {
    title: 'No encontramos este ingreso',
    text: 'Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus ingresos para elegirlo de la lista.',
  },
}

/** Frame of the screens that act on one Income, named by the `:id` of the route. */
export function OneIncomeScreen({
  title,
  children,
}: {
  title: string
  children: (income: Income, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen title={title} load={getIncome} wording={wording}>
      {children}
    </OneRecordScreen>
  )
}
