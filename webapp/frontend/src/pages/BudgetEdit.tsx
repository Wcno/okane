import { updateBudget, type Budget } from '../budgets/api'
import { budgetsBack, budgetsOf, describeBudget } from '../budgets/presentation'
import { useAfterBudgetChange } from '../budgets/useAfterBudgetChange'
import { useSignedInUser } from '../auth/context'
import { BudgetEditor } from '../components/budgets/BudgetEditor'
import { OneBudgetScreen } from '../components/budgets/OneBudgetScreen'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'

function EditForm({ budget }: { budget: Budget }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterBudgetChange()

  return (
    <>
      <ScreenHeader title="Editar Presupuesto" back={budgetsBack} intro={describeBudget(budget).details} />
      <BudgetEditor
        initial={{ categoryId: budget.categoryId, month: budget.month, amount: budget.amount }}
        save={(input) => updateBudget(budget.id, input, csrfToken)}
        onSaved={(saved) => afterChange('updated', saved)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        cancelTo={budgetsOf(budget.month)}
      >
        <DeleteLink to={`/budgets/${budget.id}/delete`}>Eliminar este Presupuesto</DeleteLink>
      </BudgetEditor>
    </>
  )
}

/** Corrects a Budget, also one of a past month: its amount, Category or month. */
export function BudgetEdit() {
  return <OneBudgetScreen title="Editar Presupuesto">{(budget) => <EditForm key={budget.id} budget={budget} />}</OneBudgetScreen>
}
