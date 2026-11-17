import { CircleCheck, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { todayInPanama } from '../accounts/form'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { categoryById } from '../data/categories'
import type { Expense } from '../expenses/api'
import { dayHeading, formatAmount, groupByDay, isExpensesNotice, offeredAccounts } from '../expenses/presentation'
import { useExpenseFeed, type FeedState } from '../expenses/useExpenseFeed'

const rowActionClassName =
  'grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

function Row({ expense, accountName }: { expense: Expense; accountName: string }) {
  const category = categoryById(expense.categoryId)
  const details = [expense.description && category.name, accountName].filter(Boolean).join(' · ')
  const title = expense.description || category.name
  const label = `${title}, ${formatAmount(expense.amount)}`

  return (
    <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
      <CategoryChip categoryId={expense.categoryId} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[1rem] font-medium">{title}</h3>
        <p className="mt-0.5 truncate text-[0.87rem] leading-snug text-ink-3">{details}</p>
      </div>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatAmount(expense.amount)}</span>
      <div className="-mr-2 flex shrink-0">
        <Link to={`/expenses/${expense.id}/edit`} aria-label={`Editar ${label}`} className={rowActionClassName}>
          <Pencil size={17} aria-hidden="true" />
        </Link>
        <Link to={`/expenses/${expense.id}/delete`} aria-label={`Eliminar ${label}`} className={rowActionClassName}>
          <Trash2 size={17} aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}

function Feed({
  state,
  accounts,
  showMore,
}: {
  state: Extract<FeedState, { status: 'ready' }>
  accounts: Account[]
  showMore: () => void
}) {
  const today = todayInPanama()
  const names = new Map(accounts.map((account) => [account.id, account.name]))

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {groupByDay(state.expenses).map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`} className={cardClassName}>
          <h2 id={`day-${group.date}`} className="text-[1rem] font-medium text-ink-2">
            {dayHeading(group.date, today)}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {group.expenses.map((expense) => (
              <Row key={expense.id} expense={expense} accountName={names.get(expense.accountId) ?? ''} />
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-col items-center gap-3 px-1 pt-1">
        <p className="text-[0.87rem] text-ink-3" role="status">
          Mostrando {state.expenses.length} de {state.total} gastos.
        </p>
        {state.more.status === 'failed' && <FormAlert>{state.more.message}</FormAlert>}
        {state.nextPage !== null && (
          <button
            type="button"
            onClick={showMore}
            disabled={state.more.status === 'loading'}
            className={`${smallSecondaryButtonClassName} justify-center disabled:opacity-70`}
          >
            {state.more.status === 'loading' ? 'Cargando…' : state.more.status === 'failed' ? 'Reintentar' : 'Mostrar más'}
          </button>
        )}
      </div>
    </div>
  )
}

function NoExpenses({ canRegister }: { canRegister: boolean }) {
  return (
    <section className={`${cardClassName} max-w-[44rem] lg:p-8`}>
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <ReceiptText size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-[1.2rem] font-semibold tracking-[-0.01em]">Aún no registras gastos</h2>
      <p className="mt-2 max-w-[60ch] text-ink-2">
        {canRegister
          ? 'Anota el último que hiciste: el monto, su Categoría y la Cuenta de la que salió. El Saldo de esa Cuenta baja al instante.'
          : 'Un gasto sale de una Cuenta de gastos o de ahorro. Crea primero la que usas para pagar.'}
      </p>
      <Link
        to={canRegister ? '/expenses/create' : '/accounts/create'}
        className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-[1rem] font-semibold text-on-primary transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]"
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        {canRegister ? 'Registrar tu primer gasto' : 'Crear tu primera cuenta'}
      </Link>
    </section>
  )
}

/** The User's Expenses, newest first under a heading for each day. */
export function Expenses() {
  const { state, retry, showMore } = useExpenseFeed()
  const accounts = useAccounts()
  const location = useLocation()
  const notice = isExpensesNotice(location.state) ? location.state.notice : null
  const known = accounts.state.status === 'ready' ? accounts.state.accounts : []

  return (
    <>
      <ScreenHeader
        title="Gastos"
        intro="Lo que has gastado, del más reciente al más antiguo."
      />

      <div role="status" aria-live="polite">
        {notice && (
          <p className="mb-4 flex max-w-[44rem] items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem] lg:mb-5">
            <CircleCheck size={18} className="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus gastos…" />
      ) : state.expenses.length === 0 ? (
        <NoExpenses canRegister={accounts.state.status !== 'ready' || offeredAccounts(known).length > 0} />
      ) : (
        <Feed state={state} accounts={known} showMore={showMore} />
      )}
    </>
  )
}
