import type { ReactNode } from 'react'
import { getBudget, type Budget } from '../../budgets/api'
import { budgetsBack } from '../../budgets/presentation'
import { OneRecordScreen, type OneRecordWording } from '../record/OneRecordScreen'

const wording: OneRecordWording = {
  back: budgetsBack,
  loading: 'Cargando el Presupuesto…',
  notHere: {
    title: 'No encontramos este Presupuesto',
    text: 'Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus Presupuestos para elegirlo de la lista.',
  },
}

/** Frame of the screens that act on one Budget, named by the `:id` of the route. */
export function OneBudgetScreen({ title, children }: { title: string; children: (budget: Budget) => ReactNode }) {
  return (
    <OneRecordScreen title={title} load={getBudget} wording={wording}>
      {(budget) => children(budget)}
    </OneRecordScreen>
  )
}
