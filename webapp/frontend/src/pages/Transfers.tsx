import { ArrowLeftRight, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { MoreFooter } from '../components/screen/MoreFooter'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { TransferChip } from '../components/transfers/TransferChip'
import { todayInPanama } from '../lib/dates'
import { dayHeading, groupByDay } from '../lib/days'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'
import type { PagedFeed } from '../lib/usePagedFeed'
import type { Transfer } from '../transfers/api'
import { NEEDS_TWO_ACCOUNTS, describeTransfer, offeredAccounts } from '../transfers/presentation'
import { useTransferFeed } from '../transfers/useTransferFeed'

const rowId = (transfer: Transfer) => `transfer-${transfer.id}`

function Row({ transfer, accounts }: { transfer: Transfer; accounts: Map<number, Account> }) {
  const { title, details, label } = describeTransfer(transfer, accounts)

  return (
    <RecordRow
      id={rowId(transfer)}
      to={`/transfers/${transfer.id}/edit`}
      label={`Editar transferencia ${label}, ${formatMoney(transfer.amount)}${transfer.description && `, ${transfer.description}`}`}
      icon={<TransferChip />}
      title={title}
      details={details}
      amount={transfer.amount}
    />
  )
}

function Feed({
  feed,
  accounts,
  canRegister,
  showMore,
}: {
  feed: PagedFeed<Transfer>
  accounts: Account[]
  canRegister: boolean
  showMore: () => void
}) {
  const today = todayInPanama()
  const byId = new Map(accounts.map((account) => [account.id, account]))

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {canRegister && (
        <Link to="/transfers/create" className={smallSecondaryButtonClassName}>
          <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
          Nueva transferencia
        </Link>
      )}
      {groupByDay(feed.items).map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`} className={cardClassName}>
          <h2 id={`day-${group.date}`} className="text-[1rem] font-medium text-ink-2">
            {dayHeading(group.date, today)}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {group.items.map((transfer) => (
              <Row key={transfer.id} transfer={transfer} accounts={byId} />
            ))}
          </ul>
        </section>
      ))}
      <MoreFooter feed={feed} noun="transferencias" rowId={rowId} showMore={showMore} />
    </div>
  )
}

/** The User's Transfers, newest first under a heading for each day. */
export function Transfers() {
  const { state, retry, showMore } = useTransferFeed()
  const accounts = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const canRegister = accounts.state.status !== 'ready' || offeredAccounts(known).length >= 2

  return (
    <>
      <ScreenHeader title="Transferencias" intro="El dinero que moviste entre tus Cuentas, del más reciente al más antiguo." />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus transferencias…" />
      ) : state.value.items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Aún no registras transferencias"
          text={
            canRegister
              ? 'Mueve dinero de una Cuenta a otra, por ejemplo al ahorro o a tu Cuenta de inversión. No cuenta como gasto y el total de tus Saldos no cambia.'
              : NEEDS_TWO_ACCOUNTS
          }
          action={
            canRegister
              ? { to: '/transfers/create', label: 'Registrar tu primera transferencia' }
              : { to: '/accounts/create', label: 'Crear una cuenta' }
          }
        />
      ) : (
        <Feed feed={state.value} accounts={known} canRegister={canRegister} showMore={showMore} />
      )}
    </>
  )
}
