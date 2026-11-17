import { useNavigate } from 'react-router-dom'
import { deleteAccount, type Account } from '../accounts/api'
import { accountsBack, accountTypeLabels } from '../accounts/presentation'
import { useSignedInUser } from '../auth/context'
import { AccountIcon } from '../components/accounts/AccountIcon'
import { OneAccountScreen } from '../components/accounts/OneAccountScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { formatMoney } from '../lib/money'
import type { ScreenNotice } from '../lib/notice'

function Confirmation({ account }: { account: Account }) {
  const { csrfToken } = useSignedInUser()
  const navigate = useNavigate()

  const isArchived = account.archivedAt !== null
  // An Account with records is archived instead: deleting it would rewrite history.
  const willArchive = account.hasRecords
  const title = isArchived ? 'Esta Cuenta ya está archivada' : willArchive ? 'Archivar cuenta' : 'Eliminar cuenta'

  return (
    <>
      <ScreenHeader title={title} back={accountsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<AccountIcon account={account} />}
            title={account.name}
            details={accountTypeLabels[account.type]}
            amount={account.balance}
          />
        }
        message={
          isArchived
            ? 'Ya no se ofrece para registrar nada nuevo. Su Saldo y su historial se conservan en tus totales.'
            : willArchive
              ? `Esta Cuenta tiene movimientos, así que no se borra: se archiva. Dejará de ofrecerse para registrar algo nuevo, y su Saldo de ${formatMoney(account.balance)} y su historial seguirán contando en tus totales.`
              : 'Esta Cuenta no tiene movimientos. Se borrará por completo y no podrás recuperarla.'
        }
        cancel={{ to: '/accounts', label: isArchived ? 'Volver a Cuentas' : 'Cancelar' }}
        confirm={
          isArchived
            ? undefined
            : {
                label: willArchive ? 'Archivar cuenta' : 'Eliminar cuenta',
                busyLabel: willArchive ? 'Archivando…' : 'Eliminando…',
                run: () => deleteAccount(account.id, csrfToken),
                onSaved: (removal) => {
                  const state: ScreenNotice = {
                    notice:
                      removal.result === 'deleted'
                        ? `Eliminaste ${account.name}.`
                        : `Archivaste ${account.name}. Su Saldo de ${formatMoney(removal.account.balance)} sigue en tus totales.`,
                  }
                  navigate('/accounts', { state })
                },
                failure: 'No pudimos completar el cambio. Inténtalo de nuevo.',
              }
        }
      />
    </>
  )
}

/** Delete account: removes one without records, archives one that has them. */
export function AccountDelete() {
  return <OneAccountScreen title="Eliminar cuenta">{(account) => <Confirmation account={account} />}</OneAccountScreen>
}
