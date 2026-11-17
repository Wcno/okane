import { ReceiptText } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { MoreFooter } from '../components/screen/MoreFooter'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import type { Expense } from '../expenses/api'
import { NEEDS_AN_ACCOUNT, describeExpense, offeredAccounts } from '../expenses/presentation'
import { useExpenseFeed, type ExpenseFeed } from '../expenses/useExpenseFeed'
import { todayInPanama } from '../lib/dates'
import { dayHeading, groupByDay } from '../lib/days'
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
      {groupByDay(feed.items).map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`} className={cardClassName}>
          <h2 id={`day-${group.date}`} className="text-[1rem] font-medium text-ink-2">
            {dayHeading(group.date, today)}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {group.items.map((expense) => (
              <Row key={expense.id} expense={expense} accountName={names.get(expense.accountId) ?? ''} />
            ))}
          </ul>
        </section>
      ))}

      <MoreFooter feed={feed} noun="gastos" rowId={rowId} showMore={showMore} />
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
      ) : state.value.items.length === 0 ? (
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
