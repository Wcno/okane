import { Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { todayInPanama } from '../accounts/form'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { categoryById } from '../data/categories'
import type { Expense } from '../expenses/api'
import { dayHeading, groupByDay, offeredAccounts } from '../expenses/presentation'
import { useExpenseFeed, type ExpenseFeed } from '../expenses/useExpenseFeed'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'

const rowActionClassName =
  'grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink'

function Row({ expense, accountName }: { expense: Expense; accountName: string }) {
  const category = categoryById(expense.categoryId)
  const details = [expense.description && category.name, accountName].filter(Boolean).join(' · ')
  const title = expense.description || category.name
  const label = `${title}, ${formatMoney(expense.amount)}`

  return (
    <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
      <CategoryChip categoryId={expense.categoryId} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[1rem] font-medium">{title}</h3>
        <p className="mt-0.5 truncate text-[0.87rem] leading-snug text-ink-3">{details}</p>
      </div>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(expense.amount)}</span>
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
  feed,
  accounts,
  showMore,
}: {
  feed: ExpenseFeed
  accounts: Account[]
  showMore: () => void
}) {
  const today = todayInPanama()
  const names = new Map(accounts.map((account) => [account.id, account.name]))

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {groupByDay(feed.expenses).map((group) => (
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
          Mostrando {feed.expenses.length} de {feed.total} gastos.
        </p>
        {feed.more.status === 'failed' && <FormAlert>{feed.more.message}</FormAlert>}
        {feed.nextPage !== null && (
          <button
            type="button"
            onClick={showMore}
            disabled={feed.more.status === 'loading'}
            className={`${smallSecondaryButtonClassName} justify-center disabled:opacity-70`}
          >
            {feed.more.status === 'loading' ? 'Cargando…' : feed.more.status === 'failed' ? 'Reintentar' : 'Mostrar más'}
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
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []

  return (
    <>
      <ScreenHeader
        title="Gastos"
        intro="Lo que has gastado, del más reciente al más antiguo."
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus gastos…" />
      ) : state.value.expenses.length === 0 ? (
        <NoExpenses canRegister={accounts.state.status !== 'ready' || offeredAccounts(known).length > 0} />
      ) : (
        <Feed feed={state.value} accounts={known} showMore={showMore} />
      )}
    </>
  )
}
