import { ChartLine, Plus, TrendingDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAccounts } from '../accounts/useAccounts'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { TradeChip } from '../components/investments/TradeChip'
import { DayFeed } from '../components/screen/DayFeed'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader } from '../components/screen/Screen'
import { listTransactions, type Transaction } from '../investments/api'
import { describeTransaction } from '../investments/presentation'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'
import { usePagedFeed } from '../lib/usePagedFeed'

const rowId = (transaction: Transaction) => `transaction-${transaction.id}`

const kindNoun = (transaction: Transaction) => (transaction.type === 'buy' ? 'compra' : 'venta')

function Row({ transaction, accountName }: { transaction: Transaction; accountName: string }) {
  const { title, details } = describeTransaction(transaction, accountName)

  return (
    <RecordRow
      id={rowId(transaction)}
      to={`/investments/transactions/${transaction.id}/edit`}
      label={`Editar ${kindNoun(transaction)} ${title}, ${formatMoney(transaction.cashAmount)}${accountName && `, ${accountName}`}`}
      icon={<TradeChip kind={transaction.type} />}
      title={title}
      details={details}
      amount={transaction.cashAmount}
    />
  )
}

/** The User's Transacciones de inversión, newest first under a heading for each day. */
export function Transactions() {
  const { state, retry, showMore } = usePagedFeed(listTransactions)
  const accounts = useAccounts()
  const notice = noticeFrom(useLocation().state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const names = new Map(known.map((account) => [account.id, account.name]))

  return (
    <>
      <ScreenHeader
        title="Transacciones de inversión"
        intro="Tus compras y ventas, de la más reciente a la más antigua."
      />

      <div className="mb-5 flex flex-wrap gap-3 lg:mb-6">
        <Link to="/investments/transactions/buy" className={smallSecondaryButtonClassName}>
          <Plus size={17} aria-hidden="true" />
          Registrar compra
        </Link>
        <Link to="/investments/transactions/sell" className={smallSecondaryButtonClassName}>
          <TrendingDown size={17} aria-hidden="true" />
          Registrar venta
        </Link>
      </div>

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus transacciones de inversión…" />
      ) : state.value.items.length === 0 ? (
        <EmptyState
          icon={ChartLine}
          title="Aún no registras compras ni ventas"
          text="Cuando compres o vendas un Activo en tu Cuenta de inversión, la operación aparecerá aquí con su importe y su Cuenta."
          action={{ to: '/investments/transactions/buy', label: 'Registrar tu primera compra' }}
        />
      ) : (
        <DayFeed
          feed={state.value}
          noun="transacciones de inversión"
          rowId={rowId}
          showMore={showMore}
          renderRow={(transaction) => (
            <Row transaction={transaction} accountName={names.get(transaction.accountId) ?? ''} />
          )}
        />
      )}
    </>
  )
}
