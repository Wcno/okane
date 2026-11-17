import { ReceiptText } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { offeredAccounts } from '../accounts/presentation'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import type { Expense } from '../expenses/api'
import { NEEDS_AN_ACCOUNT_FOR_EXPENSE, describeExpense } from '../expenses/presentation'
import { useExpenseFeed } from '../expenses/useExpenseFeed'
import { noticeFrom } from '../lib/notice'

const rowId = (expense: Expense) => `expense-${expense.id}`

function Row({ expense, accountName }: { expense: Expense; accountName: string }) {
  const { title, details } = describeExpense(expense, accountName)

  return (
    <RecordRow
      id={rowId(expense)}
      to={`/expenses/${expense.id}/edit`}
      action="Editar gasto"
      icon={<CategoryChip categoryId={expense.categoryId} />}
      title={title}
      details={details}
      amount={expense.amount}
    />
  )
}

/** The User's Expenses, newest first under a heading for each day. */
export function Expenses() {
  const { state, retry, showMore } = useExpenseFeed()
  const accounts = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const names = new Map(known.map((account) => [account.id, account.name]))
  const canRegister = accounts.state.status !== 'ready' || offeredAccounts(known).length > 0

  return (
    <>
      <ScreenHeader title="Gastos" intro="Lo que has gastado, del más reciente al más antiguo." />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus gastos…" />
      ) : state.value.records.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Aún no registras gastos"
          text={
            canRegister
              ? 'Anota el último que hiciste: el monto, su Categoría y la Cuenta de la que salió. El Saldo de esa Cuenta baja al instante.'
              : NEEDS_AN_ACCOUNT_FOR_EXPENSE
          }
          action={
            canRegister
              ? { to: '/expenses/create', label: 'Registrar tu primer gasto' }
              : { to: '/accounts/create', label: 'Crear tu primera cuenta' }
          }
        />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(expense) => <Row key={expense.id} expense={expense} accountName={names.get(expense.accountId) ?? ''} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} gastos.`}
        />
      )}
    </>
  )
}
