import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { OneTransactionScreen } from '../components/investments/OneTransactionScreen'
import { TradeEditor } from '../components/investments/TradeEditor'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'
import { updateTrade, type Transaction } from '../investments/api'
import { tradingAccounts } from '../investments/form'
import { formatUnits, transactionsBack } from '../investments/presentation'
import { useAfterTradeChange } from '../investments/useAfterTradeChange'

function EditForm({ transaction, accounts }: { transaction: Transaction; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterTradeChange()
  const current = accounts.find((account) => account.id === transaction.accountId)
  const isOnArchivedAccount = current !== undefined && current.archivedAt !== null
  const kindNoun = transaction.type === 'buy' ? 'compra' : 'venta'

  return (
    <>
      <ScreenHeader title={`Editar ${kindNoun}`} back={transactionsBack} />
      <TradeEditor
        kind={transaction.type}
        initial={{
          accountId: transaction.accountId,
          asset: transaction.asset,
          units: formatUnits(transaction.units),
          unitPrice: formatUnits(transaction.unitPrice),
          date: transaction.date,
        }}
        accounts={tradingAccounts(accounts, transaction.accountId)}
        save={(trade) => updateTrade(transaction.id, trade, csrfToken)}
        onSaved={(trade, asset) => afterChange('updated', trade, asset)}
        labels={{ submit: 'Guardar cambios', submitting: 'Guardando…' }}
        cancelTo={transactionsBack.to}
        accountNote={
          isOnArchivedAccount
            ? 'Esta Cuenta está archivada. Puedes corregirla, pero ya no se ofrece para compras ni ventas nuevas.'
            : undefined
        }
      >
        <DeleteLink to={`/investments/transactions/${transaction.id}/delete`}>{`Eliminar esta ${kindNoun}`}</DeleteLink>
      </TradeEditor>
    </>
  )
}

/** Corrects a purchase or a sale: any field, including its Account and Asset. Positions and Balances follow. */
export function TransactionEdit() {
  return (
    <OneTransactionScreen title="Editar transacción">
      {(transaction, accounts) => <EditForm key={transaction.id} transaction={transaction} accounts={accounts} />}
    </OneTransactionScreen>
  )
}
