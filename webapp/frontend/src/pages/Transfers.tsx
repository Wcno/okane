import { ArrowLeftRight } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { TransferChip } from '../components/transfers/TransferChip'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'
import type { Transfer } from '../transfers/api'
import { NEEDS_TWO_ACCOUNTS, describeTransfer, transferAccounts } from '../transfers/presentation'
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

/** The User's Transfers, newest first under a heading for each day. */
export function Transfers() {
  const { state, retry, showMore } = useTransferFeed()
  const accounts = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const byId = new Map(known.map((account) => [account.id, account]))
  const canRegister = accounts.state.status !== 'ready' || transferAccounts(known).length >= 2
  const create = { to: '/transfers/create', label: 'Registrar transferencia' }

  return (
    <>
      <ScreenHeader
        title="Transferencias"
        intro="El dinero que moviste entre tus Cuentas, del más reciente al más antiguo."
        action={canRegister && state.status === 'ready' && state.value.records.length > 0 ? create : undefined}
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus transferencias…" />
      ) : state.value.records.length === 0 ? (
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
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(transfer) => <Row key={transfer.id} transfer={transfer} accounts={byId} />}
          countText={(shown, total) => `Mostrando ${shown} de ${total} transferencias.`}
        />
      )}
    </>
  )
}
