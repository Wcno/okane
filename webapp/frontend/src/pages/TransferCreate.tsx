import { Wallet } from 'lucide-react'
import { useAccounts } from '../accounts/useAccounts'
import { useSignedInUser } from '../auth/context'
import { primaryButtonClassName } from '../components/buttons'
import { Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { TransferEditor } from '../components/transfers/TransferEditor'
import { Link } from 'react-router-dom'
import { todayInPanama } from '../lib/dates'
import { createTransfer } from '../transfers/api'
import { chooseDefaultAccounts } from '../transfers/form'
import { NEEDS_TWO_ACCOUNTS, transferAccounts, transfersBack } from '../transfers/presentation'
import { useAfterTransferChange } from '../transfers/useAfterTransferChange'

/** Registers a Transfer: amount, the Account it leaves and the one it reaches; the date starts as today. */
export function TransferCreate() {
  const { csrfToken } = useSignedInUser()
  const afterChange = useAfterTransferChange()
  const { state, retry } = useAccounts()
  const offered = state.status === 'ready' ? transferAccounts(state.value) : []

  return (
    <>
      <ScreenHeader
        title="Nueva transferencia"
        back={transfersBack}
        intro="Mueve dinero entre dos de tus Cuentas. No es un gasto ni un ingreso: el total de tus Saldos no cambia."
      />
      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      ) : offered.length < 2 ? (
        <section className={`${cardClassName} max-w-[34rem]`}>
          <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <h2 className="mt-4 mb-2 text-[1.2rem] font-semibold tracking-[-0.01em]">Primero necesitas dos Cuentas</h2>
          <p className="text-ink-2">{NEEDS_TWO_ACCOUNTS}</p>
          <Link to="/accounts/create" className={`${primaryButtonClassName} mt-4`}>
            Crear cuenta
          </Link>
        </section>
      ) : (
        <TransferEditor
          initial={{ amount: '', ...chooseDefaultAccounts(offered), date: todayInPanama(), description: '' }}
          accounts={offered}
          save={(transfer) => createTransfer(transfer, csrfToken)}
          onSaved={(transfer) => afterChange('created', transfer)}
          submitLabel="Registrar transferencia"
          submittingLabel="Registrando…"
        />
      )}
    </>
  )
}
