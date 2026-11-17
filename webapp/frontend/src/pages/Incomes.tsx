import { ArrowDownToLine } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { offeredAccounts } from '../accounts/presentation'
import { useAccounts } from '../accounts/useAccounts'
import { IncomeChip } from '../components/incomes/IncomeChip'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import type { Income } from '../incomes/api'
import { NEEDS_AN_ACCOUNT_FOR_INCOME, describeIncome } from '../incomes/presentation'
import { useIncomeFeed } from '../incomes/useIncomeFeed'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'

const rowId = (income: Income) => `income-${income.id}`

function Row({ income, accountName }: { income: Income; accountName: string }) {
  const { title, details } = describeIncome(income, accountName)

  return (
    <RecordRow
      id={rowId(income)}
      to={`/incomes/${income.id}/edit`}
      label={`Editar ingreso ${title}, ${formatMoney(income.amount)}${accountName && `, ${accountName}`}`}
      icon={<IncomeChip />}
      title={title}
      details={details}
      amount={income.amount}
    />
  )
}

/** The User's Incomes, newest first under a heading for each day. */
export function Incomes() {
  const { state, retry, showMore } = useIncomeFeed()
  const accounts = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const names = new Map(known.map((account) => [account.id, account.name]))
  const canRegister = accounts.state.status !== 'ready' || offeredAccounts(known).length > 0

  return (
    <>
      <ScreenHeader
        title="Ingresos"
        intro="El dinero que ha entrado a tus Cuentas, del más reciente al más antiguo."
        action={canRegister ? { to: '/incomes/create', label: 'Registrar ingreso' } : undefined}
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus ingresos…" />
      ) : state.value.records.length === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title="Aún no registras ingresos"
          text={
            canRegister
              ? 'Anota el último que recibiste: el monto y la Cuenta a la que entró. El Saldo de esa Cuenta sube al instante.'
              : NEEDS_AN_ACCOUNT_FOR_INCOME
          }
          action={
            canRegister
              ? { to: '/incomes/create', label: 'Registrar tu primer ingreso' }
              : { to: '/accounts/create', label: 'Crear tu primera cuenta' }
          }
        />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(income) => <Row key={income.id} income={income} accountName={names.get(income.accountId) ?? ''} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} ingresos.`}
        />
      )}
    </>
  )
}
