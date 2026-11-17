import { Plus, PiggyBank } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { hasBudget, type Budget, type BudgetLine, type BudgetMonth } from '../budgets/api'
import { describeBudget, unbudgetedWithSpending } from '../budgets/presentation'
import { useBudgetMonth } from '../budgets/useBudgetMonth'
import { MonthSwitcher } from '../components/budgets/MonthSwitcher'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { categoryById } from '../data/categories'
import { todayInPanama } from '../lib/dates'
import { sumAmounts } from '../lib/decimal'
import { formatMoney } from '../lib/money'
import { isMonth, monthName, monthOf } from '../lib/months'
import { noticeFrom } from '../lib/notice'

function BudgetRow({ budget }: { budget: Budget }) {
  const { title, details } = describeBudget(budget)
  return (
    <RecordRow
      to={`/budgets/${budget.id}/edit`}
      label={`Editar Presupuesto de ${title}, Restante ${formatMoney(budget.remaining)}`}
      icon={<CategoryChip categoryId={budget.categoryId} />}
      title={title}
      details={details}
      amount={budget.remaining}
    />
  )
}

function UnbudgetedRow({ line }: { line: BudgetLine }) {
  const name = categoryById(line.categoryId).name
  return (
    <RecordRow
      to={`/budgets/create?month=${line.month}&category=${line.categoryId}`}
      label={`Crear Presupuesto de ${name}, gastado ${formatMoney(line.spent)}`}
      icon={<CategoryChip categoryId={line.categoryId} />}
      title={name}
      details="Sin Presupuesto · solo lo gastado"
      amount={line.spent}
    />
  )
}

function Totals({ budgets }: { budgets: Budget[] }) {
  const figures = [
    { label: 'Presupuestado', value: sumAmounts(budgets.map((budget) => budget.amount)) },
    { label: 'Gastado', value: sumAmounts(budgets.map((budget) => budget.spent)) },
    { label: 'Restante', value: sumAmounts(budgets.map((budget) => budget.remaining)) },
  ]
  return (
    <section aria-label="Resumen del mes" className={`${cardClassName} mb-4 max-w-[44rem] lg:mb-5`}>
      <dl className="grid grid-cols-3 gap-3">
        {figures.map((figure) => (
          <div key={figure.label} className="min-w-0">
            <dt className="text-[0.87rem] text-ink-3">{figure.label}</dt>
            <dd className="mt-0.5 break-words text-[1.1rem] font-semibold tabular-nums">{formatMoney(figure.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Month({ budgets, unbudgeted }: { budgets: Budget[]; unbudgeted: BudgetLine[] }) {
  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {budgets.length > 0 && (
        <>
          <Totals budgets={budgets} />
          <section aria-labelledby="budgeted-title" className={cardClassName}>
            <h2 id="budgeted-title" className="text-[1rem] font-medium text-ink-2">
              Restante por Categoría
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {budgets.map((budget) => (
                <BudgetRow key={budget.id} budget={budget} />
              ))}
            </ul>
          </section>
        </>
      )}
      {unbudgeted.length > 0 && (
        <section aria-labelledby="unbudgeted-title" className={cardClassName}>
          <h2 id="unbudgeted-title" className="text-[1rem] font-medium text-ink-2">
            Gastado sin Presupuesto
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {unbudgeted.map((line) => (
              <UnbudgetedRow key={line.categoryId} line={line} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** The Budgets of a month and what is left of each: Presupuesto, gastado and Restante by Category. */
function Loaded({ data, month }: { data: BudgetMonth; month: string }) {
  const budgets = data.lines.filter(hasBudget)
  const unbudgeted = unbudgetedWithSpending(data.lines)

  if (budgets.length === 0 && unbudgeted.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title={`Sin Presupuestos en ${monthName(month)}`}
        text="Ponle un límite mensual a una Categoría y verás cuánto te queda a medida que registras gastos."
        action={{ to: `/budgets/create?month=${month}`, label: 'Crear un Presupuesto' }}
      />
    )
  }
  return (
    <>
      <Month budgets={budgets} unbudgeted={unbudgeted} />
      <Link to={`/budgets/create?month=${month}`} className={`${smallSecondaryButtonClassName} mt-5`}>
        <Plus size={17} aria-hidden="true" />
        Nuevo Presupuesto
      </Link>
    </>
  )
}

export function Budgets() {
  const [params] = useSearchParams()
  const currentMonth = monthOf(todayInPanama())
  const asked = params.get('month') ?? ''
  const month = isMonth(asked) ? asked : currentMonth
  const { state, retry } = useBudgetMonth(month)
  const notice = noticeFrom(useLocation().state)

  return (
    <>
      <ScreenHeader
        title="Presupuestos"
        intro="Cuánto te queda en cada Categoría después de lo gastado y lo comprometido."
      />
      <MonthSwitcher month={month} currentMonth={currentMonth} />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Presupuestos…" />
      ) : (
        <Loaded data={state.value} month={month} />
      )}
    </>
  )
}
