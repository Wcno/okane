import { useSearchParams } from 'react-router-dom'
import { createBudget } from '../budgets/api'
import { budgetsBack, budgetsOf } from '../budgets/presentation'
import { useAfterBudgetChange } from '../budgets/useAfterBudgetChange'
import { useSignedInUser } from '../auth/context'
import { BudgetEditor } from '../components/budgets/BudgetEditor'
import { ScreenHeader } from '../components/screen/Screen'
import { findCategory, isOffered } from '../categories/catalog'
import { todayInPanama } from '../lib/dates'
import { isMonth, monthOf } from '../lib/months'

/** Creates a Budget: one per Category and month. The month and Category can arrive in the address. */
export function BudgetCreate() {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterBudgetChange()
  const [params] = useSearchParams()
  const asked = params.get('month') ?? ''
  const month = isMonth(asked) ? asked : monthOf(todayInPanama())
  const asking = findCategory(Number(params.get('category')))
  const category = asking && isOffered(asking) ? asking : undefined

  return (
    <>
      <ScreenHeader
        title="Nuevo Presupuesto"
        back={budgetsBack}
        intro="Define cuánto quieres gastar en una Categoría durante un mes. Solo puede haber uno por Categoría y mes."
      />
      <BudgetEditor
        initial={{ categoryId: category?.id ?? null, month, amount: '' }}
        save={(budget) => createBudget(budget, csrfToken)}
        onSaved={(budget) => afterChange('created', budget)}
        submitLabel="Crear Presupuesto"
        submittingLabel="Creando…"
        cancelTo={budgetsOf(month)}
      />
    </>
  )
}
