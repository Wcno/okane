import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import type { Account } from '../../accounts/api'
import { accountsBack, findAccount } from '../../accounts/presentation'
import { useAccounts } from '../../accounts/useAccounts'
import { NotHere, Pending, ScreenHeader } from '../screen/Screen'

/**
 * Frame of the screens that act on one Account, named by the `:id` of the
 * route. An unknown or foreign id gets the same answer: the Account is not here.
 */
export function OneAccountScreen({
  title,
  children,
}: {
  title: string
  children: (account: Account) => ReactNode
}) {
  const { id } = useParams()
  const { state, retry } = useAccounts()

  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title={title} back={accountsBack} />
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      </>
    )
  }
  const account = findAccount(state.value, id)
  if (!account) {
    return (
      <NotHere
        title="No encontramos esta Cuenta"
        text="Puede que la hayas eliminado o que la dirección esté incompleta. Vuelve a tus Cuentas para elegirla de la lista."
        back={accountsBack}
      />
    )
  }
  return <>{children(account)}</>
}
