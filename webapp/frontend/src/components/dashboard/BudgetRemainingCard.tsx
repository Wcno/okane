import { describeBudget } from '../../budgets/presentation'
import type { Dashboard } from '../../dashboard/api'
import { sumAmounts } from '../../lib/decimal'
import { formatMoney } from '../../lib/money'
import { CategoryChip } from '../expenses/CategoryChip'
import { RecordRow } from '../screen/RecordRow'
import { Card } from './Card'

/** Remaining Budget per Category of the month, after what was spent and what is committed. */
export function BudgetRemainingCard({ budgets }: Pick<Dashboard, 'budgets'>) {
  const budgeted = sumAmounts(budgets.map((budget) => budget.amount))
  const spent = sumAmounts(budgets.map((budget) => budget.spent))

  return (
    <Card id="remaining" title="Restante por Categoría" link={{ to: '/budgets', text: 'Presupuestos' }}>
      {budgets.length === 0 ? (
        <p className="mt-2 max-w-[52ch] text-ink-2">
          Aún no tienes Presupuestos este mes. Ponle un límite a una Categoría y verás cuánto te queda.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[0.95rem] text-ink-3">
            Gastado {formatMoney(spent)} de {formatMoney(budgeted)} presupuestados
          </p>
          <ul className="mt-3 divide-y divide-line">
            {budgets.map((budget) => {
              const { title, details } = describeBudget(budget)
              return (
                <RecordRow
                  key={budget.id}
                  to={`/budgets/${budget.id}/edit`}
                  action="Editar Presupuesto"
                  icon={<CategoryChip categoryId={budget.categoryId} />}
                  title={title}
                  details={details}
                  amount={budget.remaining}
                />
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
