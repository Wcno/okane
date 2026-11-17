import type { ReactNode } from 'react'
import { listAccounts, type Account } from '../../accounts/api'
import { getTransaction, type Transaction } from '../../investments/api'
import { transactionsBack } from '../../investments/presentation'
import { OneRecordScreen } from '../screen/OneRecordScreen'

/**
 * Frame of the screens that act on one Transaction de inversión, named by the
 * `:id` of the route. A foreign, unknown or malformed id gets the same answer.
 */
export function OneTransactionScreen({
  title,
  children,
}: {
  title: string
  children: (transaction: Transaction, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen
      title={title}
      back={transactionsBack}
      notHere={{
        title: 'No encontramos esta Transacción de inversión',
        text: 'Puede que la hayas eliminado o que la dirección esté incompleta. Vuelve a la lista para elegirla.',
      }}
      loading="Cargando la Transacción de inversión…"
      load={async (id) => {
        const [transaction, accounts] = await Promise.all([getTransaction(id), listAccounts()])
        return { transaction, accounts }
      }}
    >
      {({ transaction, accounts }) => children(transaction, accounts)}
    </OneRecordScreen>
  )
}
