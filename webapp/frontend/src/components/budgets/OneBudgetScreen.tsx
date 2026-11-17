import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { getBudget, type Budget } from '../../budgets/api'
import { budgetsBack } from '../../budgets/presentation'
import { useLoaded } from '../../lib/useLoaded'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

const BUDGET_ID = /^[1-9]\d{0,17}$/

function BudgetNotHere() {
  return (
    <NotHere
      title="No encontramos este Presupuesto"
      text="Puede que lo hayas eliminado o que la dirección esté incompleta. Vuelve a tus Presupuestos para elegirlo de la lista."
      back={budgetsBack}
    />
  )
}

function LoadedBudget({
  budgetId,
  title,
  children,
}: {
  budgetId: number
  title: string
  children: (budget: Budget) => ReactNode
}) {
  const { state, retry } = useLoaded(() => getBudget(budgetId), budgetId)

  if (state.status === 'gone') return <BudgetNotHere />
  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={budgetsBack} />
        <Pending state={state} retry={retry} loading="Cargando el Presupuesto…" />
      </>
    )
  }
  return <>{children(state.value)}</>
}

/**
 * Frame of the screens that act on one Budget, named by the `:id` of the
 * route. A foreign, unknown or malformed id gets the same answer: the Budget is not here.
 */
export function OneBudgetScreen({ title, children }: { title: string; children: (budget: Budget) => ReactNode }) {
  const { id } = useParams()
  if (!BUDGET_ID.test(id ?? '')) return <BudgetNotHere />
  return (
    <LoadedBudget budgetId={Number(id)} title={title}>
      {children}
    </LoadedBudget>
  )
}
