import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import { getTransaction, type Transaction } from '../../investments/api'
import { transactionsBack } from '../../investments/presentation'
import { OneRecordScreen, type OneRecordWording } from '../record/OneRecordScreen'

const wording: OneRecordWording = {
  back: transactionsBack,
  loading: 'Cargando la Transacción de inversión…',
  notHere: {
    title: 'No encontramos esta Transacción de inversión',
    text: 'Puede que la hayas eliminado o que la dirección esté incompleta. Vuelve a la lista para elegirla.',
  },
}

/** Frame of the screens that act on one Transacción de inversión, named by the `:id` of the route. */
export function OneTransactionScreen({
  title,
  children,
}: {
  title: string
  children: (transaction: Transaction, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen title={title} load={getTransaction} wording={wording}>
      {children}
    </OneRecordScreen>
  )
}
