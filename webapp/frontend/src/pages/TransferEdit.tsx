import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { DeleteLink } from '../components/screen/DeleteLink'
import { ScreenHeader } from '../components/screen/Screen'
import { OneTransferScreen } from '../components/transfers/OneTransferScreen'
import { TransferEditor } from '../components/transfers/TransferEditor'
import { updateTransfer, type Transfer } from '../transfers/api'
import { transferAccounts, transfersBack } from '../transfers/presentation'
import { useAfterTransferChange } from '../transfers/useAfterTransferChange'

function EditForm({ transfer, accounts }: { transfer: Transfer; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterTransferChange()
  const kept = [transfer.sourceAccountId, transfer.destinationAccountId]
  const touchesArchived = accounts.some((account) => kept.includes(account.id) && account.archivedAt !== null)

  return (
    <>
      <ScreenHeader title="Editar transferencia" back={transfersBack} />
      <TransferEditor
        initial={{
          amount: transfer.amount,
          sourceAccountId: transfer.sourceAccountId,
          destinationAccountId: transfer.destinationAccountId,
          date: transfer.date,
          description: transfer.description,
        }}
        accounts={transferAccounts(accounts, kept)}
        save={(input) => updateTransfer(transfer.id, input, csrfToken)}
        onSaved={(saved) => afterChange('updated', saved)}
        submitLabel="Guardar cambios"
        submittingLabel="Guardando…"
        accountNote={
          touchesArchived
            ? 'Una de estas Cuentas está archivada. Puedes corregir la transferencia, pero ya no se ofrece para transferencias nuevas.'
            : undefined
        }
      >
        <DeleteLink to={`/transfers/${transfer.id}/delete`}>Eliminar esta transferencia</DeleteLink>
      </TransferEditor>
    </>
  )
}

/** Corrects a Transfer: any field, including either Account. Both Balances follow. */
export function TransferEdit() {
  return (
    <OneTransferScreen title="Editar transferencia">
      {(transfer, accounts) => <EditForm key={transfer.id} transfer={transfer} accounts={accounts} />}
    </OneTransferScreen>
  )
}
