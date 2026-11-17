import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { OneTransactionScreen } from '../components/investments/OneTransactionScreen'
import { TradeChip } from '../components/investments/TradeChip'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { deleteTrade, type Transaction } from '../investments/api'
import { describeTransaction, nouns, transactionsBack } from '../investments/presentation'
import { netCash } from '../investments/form'
import { useAfterTradeChange } from '../investments/useAfterTradeChange'
import { formatMoney } from '../lib/money'

function Confirmation({ transaction, accounts }: { transaction: Transaction; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterTradeChange()
  const account = accounts.find((candidate) => candidate.id === transaction.accountId)
  const { title, details } = describeTransaction(transaction, account?.name, { withDate: true })
  const kindNoun = nouns[transaction.type]
  // Deleting a purchase gives its cash back to the Account; deleting a sale or a Dividend takes the cash it returned.
  const direction = transaction.type === 'buy' ? 'subirá' : 'bajará'
  const moved = transaction.type === 'dividend' ? transaction.cashAmount : netCash(transaction.type, transaction.cashAmount, transaction.commission)

  return (
    <>
      <ScreenHeader title={`Eliminar ${kindNoun}`} back={transactionsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<TradeChip kind={transaction.type} />}
            title={title}
            details={details}
            amount={transaction.cashAmount}
          />
        }
        message={
          <>
            {`Se borrará por completo y no podrás recuperar${transaction.type === 'dividend' ? 'lo' : 'la'}.`}{' '}
            {transaction.type === 'dividend' ? 'Tus Posiciones no cambian.' : 'Tus Posiciones se recalcularán sin ella.'}
            {account && ` El Saldo de ${account.name} ${direction} ${formatMoney(moved)}.`}
          </>
        }
        cancel={{ to: transactionsBack.to, label: 'Cancelar' }}
        confirm={{
          label: `Eliminar ${kindNoun}`,
          busyLabel: 'Eliminando…',
          run: () => deleteTrade(transaction.id, csrfToken),
          onSaved: () => afterChange('deleted', transaction, transaction.asset),
          failure: 'No pudimos eliminar la transacción de inversión. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Deletes a purchase or a sale on its own screen, saying what happens to the Balance first. */
export function TransactionDelete() {
  return (
    <OneTransactionScreen title="Eliminar transacción">
      {(transaction, accounts) => <Confirmation transaction={transaction} accounts={accounts} />}
    </OneTransactionScreen>
  )
}
