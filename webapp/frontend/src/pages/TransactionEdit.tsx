import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { OneTransactionScreen } from '../components/investments/OneTransactionScreen'
import { TradeEditor } from '../components/investments/TradeEditor'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'
import { updateTrade, type Transaction } from '../investments/api'
import { tradingAccounts } from '../investments/form'
import { formatUnits, nouns, transactionsBack } from '../investments/presentation'
import { useAfterTradeChange } from '../investments/useAfterTradeChange'

function EditForm({ transaction, accounts }: { transaction: Transaction; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterTradeChange()
  const current = accounts.find((account) => account.id === transaction.accountId)
  const isOnArchivedAccount = current !== undefined && current.archivedAt !== null
  const kindNoun = nouns[transaction.type]

  return (
    <>
      <ScreenHeader title={`Editar ${kindNoun}`} back={transactionsBack} />
      <TradeEditor
        kind={transaction.type}
        initial={{
          accountId: transaction.accountId,
          asset: transaction.asset,
          units: transaction.units === null ? '' : formatUnits(transaction.units),
          unitPrice: transaction.unitPrice === null ? '' : formatUnits(transaction.unitPrice),
          commission: transaction.commission === '0.00' ? '' : transaction.commission,
          amount: transaction.type === 'dividend' ? transaction.cashAmount : '',
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
        <DeleteLink to={`/investments/transactions/${transaction.id}/delete`}>{`Eliminar ${transaction.type === 'dividend' ? 'este' : 'esta'} ${kindNoun}`}</DeleteLink>
      </TradeEditor>
    </>
  )
}

/** Corrects a purchase, a sale or a Dividend: any field, including its Account and Asset. Positions and Balances follow. */
export function TransactionEdit() {
  return (
    <OneTransactionScreen title="Editar transacción">
      {(transaction, accounts) => <EditForm key={transaction.id} transaction={transaction} accounts={accounts} />}
    </OneTransactionScreen>
  )
}
