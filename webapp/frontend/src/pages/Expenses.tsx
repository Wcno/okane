import { ReceiptText } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import type { Expense } from '../expenses/api'
import { NEEDS_AN_ACCOUNT, dayHeading, describeExpense, groupByDay, offeredAccounts } from '../expenses/presentation'
import { useExpenseFeed, type ExpenseFeed } from '../expenses/useExpenseFeed'
import { todayInPanama } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'

const rowId = (expense: Expense) => `expense-${expense.id}`

function Row({ expense, accountName }: { expense: Expense; accountName: string }) {
  const { title, details } = describeExpense(expense, accountName)

  return (
    <RecordRow
      id={rowId(expense)}
      to={`/expenses/${expense.id}/edit`}
      label={`Editar gasto ${title}, ${formatMoney(expense.amount)}${accountName && `, ${accountName}`}`}
      icon={<CategoryChip categoryId={expense.categoryId} />}
      title={title}
      details={details}
      amount={expense.amount}
    />
  )
}

/**
 * After "Mostrar más" the keyboard stays where it was: on the button while
 * there are more pages, else on the first row that arrived, so it does not
 * fall back to the top of the page.
 */
function useKeepFocusAfterMore(feed: ExpenseFeed) {
  const asked = useRef(false)
  const shown = useRef(feed.expenses.length)

  useEffect(() => {
    const previous = shown.current
    shown.current = feed.expenses.length
    if (!asked.current || feed.expenses.length <= previous) return
    asked.current = false
    if (feed.nextPage === null) document.getElementById(rowId(feed.expenses[previous]))?.focus()
  }, [feed.expenses, feed.nextPage])

  return () => {
    asked.current = true
  }
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
  const rememberAsked = useKeepFocusAfterMore(feed)
  const isLoadingMore = feed.more.status === 'loading'

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
            // Not `disabled`: a disabled button drops the keyboard out of the page.
            aria-disabled={isLoadingMore}
            onClick={() => {
              if (isLoadingMore) return
              rememberAsked()
              showMore()
            }}
            className={`${smallSecondaryButtonClassName} justify-center aria-disabled:opacity-70`}
          >
            {isLoadingMore ? 'Cargando…' : feed.more.status === 'failed' ? 'Reintentar' : 'Mostrar más'}
          </button>
        )}
      </div>
    </div>
  )
}

/** The User's Expenses, newest first under a heading for each day. */
export function Expenses() {
  const { state, retry, showMore } = useExpenseFeed()
  const accounts = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const canRegister = accounts.state.status !== 'ready' || offeredAccounts(known).length > 0

  return (
    <>
      <ScreenHeader title="Gastos" intro="Lo que has gastado, del más reciente al más antiguo." />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus gastos…" />
      ) : state.value.expenses.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Aún no registras gastos"
          text={
            canRegister
              ? 'Anota el último que hiciste: el monto, su Categoría y la Cuenta de la que salió. El Saldo de esa Cuenta baja al instante.'
              : NEEDS_AN_ACCOUNT
          }
          action={
            canRegister
              ? { to: '/expenses/create', label: 'Registrar tu primer gasto' }
              : { to: '/accounts/create', label: 'Crear tu primera cuenta' }
          }
        />
      ) : (
        <Feed feed={state.value} accounts={known} showMore={showMore} />
      )}
    </>
  )
}
