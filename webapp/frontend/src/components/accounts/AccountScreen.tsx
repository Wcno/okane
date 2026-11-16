import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Account } from '../../accounts/api'
import { findAccount } from '../../accounts/presentation'
import { useAccounts, type AccountsState } from '../../accounts/useAccounts'
import { smallSecondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'

export const cardClassName = 'rounded-card border border-line bg-surface p-5 shadow-card lg:p-6'

/** Title of a screen under Cuentas, with the way back to the list. */
export function AccountScreenHeader({ title, intro, back = true }: { title: string; intro?: ReactNode; back?: boolean }) {
  return (
    <header className="mb-5 lg:mb-7 lg:pr-48">
      {back && (
        <Link
          to="/accounts"
          className="mb-2 inline-flex items-center gap-1.5 rounded-md text-[0.9rem] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Cuentas
        </Link>
      )}
      <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">{title}</h1>
      {intro && <p className="mt-1 max-w-[60ch] text-ink-2">{intro}</p>}
    </header>
  )
}

/** What a screen shows while the Accounts are not available: loading, or a failure to retry. */
export function AccountsPending({
  state,
  retry,
}: {
  state: Exclude<AccountsState, { status: 'ready' }>
  retry: () => void
}) {
  if (state.status === 'loading') {
    return (
      <p role="status" className="text-ink-3">
        Cargando tus Cuentas…
      </p>
    )
  }
  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <FormAlert>{state.message}</FormAlert>
      <button type="button" onClick={retry} className={`${smallSecondaryButtonClassName} mt-4`}>
        Reintentar
      </button>
    </section>
  )
}

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
        <AccountScreenHeader title={title} />
        <AccountsPending state={state} retry={retry} />
      </>
    )
  }
  const account = findAccount(state.accounts, id)
  if (!account) {
    return (
      <>
        <AccountScreenHeader title="No encontramos esta Cuenta" />
        <section className={`${cardClassName} max-w-[34rem]`}>
          <p className="text-ink-2">
            Puede que la hayas eliminado o que la dirección esté incompleta. Vuelve a tus Cuentas para elegirla de
            la lista.
          </p>
          <Link to="/accounts" className={`${smallSecondaryButtonClassName} mt-5`}>
            <ArrowLeft size={17} aria-hidden="true" />
            Volver a Cuentas
          </Link>
        </section>
      </>
    )
  }
  return <>{children(account)}</>
}
