import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import { getTransfer, type Transfer } from '../../transfers/api'
import { transfersBack } from '../../transfers/presentation'
import { OneRecordScreen } from '../screen/OneRecordScreen'

/** The screens that act on one Transfer, named by the `:id` of the route. */
export function OneTransferScreen({
  title,
  children,
}: {
  title: string
  children: (transfer: Transfer, accounts: Account[]) => ReactNode
}) {
  return (
    <OneRecordScreen
      title={title}
      back={transfersBack}
      load={getTransfer}
      loading="Cargando la transferencia…"
      notHere={{
        title: 'No encontramos esta transferencia',
        text: 'Puede que la hayas eliminado o que la dirección esté incompleta. Vuelve a tus transferencias para elegirla de la lista.',
      }}
    >
      {children}
    </OneRecordScreen>
  )
}
