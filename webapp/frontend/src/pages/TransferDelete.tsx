import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader } from '../components/screen/Screen'
import { OneTransferScreen } from '../components/transfers/OneTransferScreen'
import { TransferChip } from '../components/transfers/TransferChip'
import { formatMoney } from '../lib/money'
import { deleteTransfer, type Transfer } from '../transfers/api'
import { describeTransfer, transfersBack } from '../transfers/presentation'
import { useAfterTransferChange } from '../transfers/useAfterTransferChange'

function Confirmation({ transfer, accounts }: { transfer: Transfer; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterTransferChange()
  const byId = new Map(accounts.map((account) => [account.id, account]))
  const source = byId.get(transfer.sourceAccountId)
  const destination = byId.get(transfer.destinationAccountId)
  const { title, details } = describeTransfer(transfer, byId, { withDate: true })

  return (
    <>
      <ScreenHeader title="Eliminar transferencia" back={transfersBack} />
      <ConfirmCard
        summary={<RecordSummary icon={<TransferChip />} title={title} details={details} amount={transfer.amount} />}
        message={
          <>
            Se borrará por completo y no podrás recuperarla.
            {source && destination &&
              ` El Saldo de ${source.name} subirá ${formatMoney(transfer.amount)} y el de ${destination.name} bajará ${formatMoney(transfer.amount)}.`}
          </>
        }
        cancel={{ to: '/transfers', label: 'Cancelar' }}
        confirm={{
          label: 'Eliminar transferencia',
          busyLabel: 'Eliminando…',
          run: () => deleteTransfer(transfer.id, csrfToken),
          onSaved: () => afterChange('deleted', transfer),
          failure: 'No pudimos eliminar la transferencia. Inténtalo de nuevo.',
        }}
      />
    </>
  )
}

/** Deletes a Transfer on its own screen, saying what happens to both Balances first. */
export function TransferDelete() {
  return (
    <OneTransferScreen title="Eliminar transferencia">
      {(transfer, accounts) => <Confirmation transfer={transfer} accounts={accounts} />}
    </OneTransferScreen>
  )
}
