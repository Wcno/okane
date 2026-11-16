import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteAccount, type Account } from '../accounts/api'
import { accountTypeLabels, formatAmount, type AccountsNotice } from '../accounts/presentation'
import { useAccountWrite } from '../accounts/useAccounts'
import { useSignedInUser } from '../auth/context'
import { AccountIcon } from '../components/accounts/AccountIcon'
import { AccountScreenHeader, OneAccountScreen, cardClassName } from '../components/accounts/AccountScreen'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { FormAlert } from '../components/FormAlert'

function Confirmation({ account }: { account: Account }) {
  const { csrfToken } = useSignedInUser()
  const write = useAccountWrite()
  const navigate = useNavigate()
  const [failure, setFailure] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isArchived = account.archivedAt !== null
  // An Account with records is archived instead: deleting it would rewrite history.
  const willArchive = account.hasRecords
  const title = isArchived ? 'Esta Cuenta ya está archivada' : willArchive ? 'Archivar cuenta' : 'Eliminar cuenta'

  const confirm = async () => {
    if (isSubmitting) return
    setFailure(null)
    setIsSubmitting(true)
    const outcome = await write(() => deleteAccount(account.id, csrfToken))
    setIsSubmitting(false)
    if (!outcome.ok) {
      setFailure(outcome.errors.form?.join(' ') ?? 'No pudimos completar el cambio. Inténtalo de nuevo.')
      return
    }
    const state: AccountsNotice = {
      notice:
        outcome.value.result === 'deleted'
          ? `Eliminaste ${account.name}.`
          : `Archivaste ${account.name}. Su Saldo de ${formatAmount(outcome.value.account.balance)} sigue en tus totales.`,
    }
    navigate('/accounts', { state })
  }

  return (
    <>
      <AccountScreenHeader title={title} />

      <section className={`${cardClassName} max-w-[34rem]`}>
        <div className="flex items-center gap-3.5 rounded-2xl bg-surface-2 p-3.5">
          <AccountIcon account={account} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1rem] font-medium">{account.name}</h2>
            <p className="mt-0.5 text-[0.87rem] text-ink-3">{accountTypeLabels[account.type]}</p>
          </div>
          <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatAmount(account.balance)}</span>
        </div>

        <p className="mt-4 text-ink-2">
          {isArchived
            ? 'Ya no se ofrece para registrar nada nuevo. Su Saldo y su historial se conservan en tus totales.'
            : willArchive
              ? `Esta Cuenta tiene movimientos, así que no se borra: se archiva. Dejará de ofrecerse para registrar algo nuevo, y su Saldo de ${formatAmount(account.balance)} y su historial seguirán contando en tus totales.`
              : 'Esta Cuenta no tiene movimientos. Se borrará por completo y no podrás recuperarla.'}
        </p>

        {failure && (
          <div className="mt-4">
            <FormAlert>{failure}</FormAlert>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
          <Link to="/accounts" className={`${secondaryButtonClassName} sm:flex-1`}>
            {isArchived ? 'Volver a Cuentas' : 'Cancelar'}
          </Link>
          {!isArchived && (
            <button
              type="button"
              onClick={confirm}
              disabled={isSubmitting}
              className={`${primaryButtonClassName} sm:flex-[1.6]`}
            >
              {willArchive
                ? isSubmitting
                  ? 'Archivando…'
                  : 'Archivar cuenta'
                : isSubmitting
                  ? 'Eliminando…'
                  : 'Eliminar cuenta'}
            </button>
          )}
        </div>
      </section>
    </>
  )
}

/** Delete account: removes one without records, archives one that has them. */
export function AccountDelete() {
  return <OneAccountScreen title="Eliminar cuenta">{(account) => <Confirmation account={account} />}</OneAccountScreen>
}
