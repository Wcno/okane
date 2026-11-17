import { ChartLine, Coins } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAccounts } from '../accounts/useAccounts'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { TradeChip } from '../components/investments/TradeChip'
import { DayFeed } from '../components/record/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { listTransactions, type Transaction } from '../investments/api'
import { describeTransaction } from '../investments/presentation'
import { useTransactionRevision } from '../investments/transactionRevision'
import { noticeFrom } from '../lib/notice'
import { useRecordFeed } from '../lib/useRecordFeed'

const rowId = (transaction: Transaction) => `transaction-${transaction.id}`

function Row({ transaction, accountName }: { transaction: Transaction; accountName: string }) {
  const { title, details } = describeTransaction(transaction, accountName)

  return (
    <RecordRow
      id={rowId(transaction)}
      to={`/investments/transactions/${transaction.id}/edit`}
      action="Editar transacción"
      icon={<TradeChip kind={transaction.type} />}
      title={title}
      details={details}
      amount={transaction.cashAmount}
    />
  )
}

/** The User's Transacciones de inversión, newest first under a heading for each day. */
export function Transactions() {
  const { state, retry, showMore } = useRecordFeed(listTransactions, useTransactionRevision())
  const accounts = useAccounts()
  const notice = noticeFrom(useLocation().state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const names = new Map(known.map((account) => [account.id, account.name]))
  const hasRecords = state.status === 'ready' && state.value.records.length > 0

  return (
    <>
      <ScreenHeader
        title="Transacciones de inversión"
        intro="Tus compras, ventas y dividendos, de la más reciente a la más antigua."
        // With nothing registered, the empty state already asks for the first purchase.
        action={hasRecords ? { to: '/investments/transactions/buy', label: 'Registrar compra', shortLabel: 'Comprar' } : undefined}
      />

      {hasRecords && (
        <div className="mb-5 lg:mb-6">
          <Link to="/investments/transactions/dividend" className={smallSecondaryButtonClassName}>
            <Coins size={17} aria-hidden="true" />
            Registrar dividendo
          </Link>
        </div>
      )}

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus transacciones de inversión…" />
      ) : state.value.records.length === 0 ? (
        <EmptyState
          icon={ChartLine}
          title="Aún no registras compras ni ventas"
          text="Cuando compres o vendas un Activo en tu Cuenta de inversión, aparecerá aquí con su importe y su Cuenta."
          action={{ to: '/investments/transactions/buy', label: 'Registrar tu primera compra' }}
        />
      ) : (
        <DayFeed
          feed={state.value}
          showMore={showMore}
          rowId={rowId}
          row={(transaction) => (
            <Row key={transaction.id} transaction={transaction} accountName={names.get(transaction.accountId) ?? ''} />
          )}
          countText={(shown, total) => `Mostrando ${shown} de ${total} transacciones de inversión.`}
        />
      )}
    </>
  )
}
