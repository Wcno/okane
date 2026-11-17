import { deleteBudget, type Budget } from '../budgets/api'
import { budgetsBack, budgetsOf, describeBudget } from '../budgets/presentation'
import { useAfterBudgetChange } from '../budgets/useAfterBudgetChange'
import { useSignedInUser } from '../auth/context'
import { OneBudgetScreen } from '../components/budgets/OneBudgetScreen'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { monthName } from '../lib/months'

function Confirmation({ budget }: { budget: Budget }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterBudgetChange()
  const { title, details } = describeBudget(budget)

  return (
    <>
      <ScreenHeader title="Eliminar Presupuesto" back={budgetsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<CategoryChip categoryId={budget.categoryId} />}
            title={`${title} · ${monthName(budget.month)}`}
            details={details}
            amount={budget.amount}
          />
        }
        message="Se borrará el Presupuesto y la Categoría dejará de mostrar un Restante este mes. Tus gastos no cambian."
        cancel={{ to: budgetsOf(budget.month), label: 'Cancelar' }}
        confirm={{
          label: 'Eliminar Presupuesto',
          busyLabel: 'Eliminando…',
          run: () => deleteBudget(budget.id, csrfToken),
          onSaved: () => afterChange('deleted', budget),
          failure: 'No pudimos eliminar el Presupuesto. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Deletes a Budget on its own screen, saying what stays as it is first. */
export function BudgetDelete() {
  return <OneBudgetScreen title="Eliminar Presupuesto">{(budget) => <Confirmation budget={budget} />}</OneBudgetScreen>
}
