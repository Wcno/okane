import { Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { listAccounts } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { primaryButtonClassName } from '../components/buttons'
import { TradeEditor } from '../components/investments/TradeEditor'
import { Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { recordTrade, type TradeKind } from '../investments/api'
import { tradingAccounts } from '../investments/form'
import { positionsBack, tradeNotice } from '../investments/presentation'
import { todayInPanama } from '../lib/dates'
import type { ScreenNotice } from '../lib/notice'
import { useLoaded } from '../lib/useLoaded'

const headings: Record<TradeKind, { title: string; intro: string }> = {
  buy: {
    title: 'Registrar compra',
    intro: 'Anota lo que compraste. El importe sale del efectivo de la Cuenta de inversión, aunque la deje en negativo.',
  },
  sell: {
    title: 'Registrar venta',
    intro: 'Anota lo que vendiste. El importe vuelve al efectivo de la Cuenta y no puede superar las unidades que tienes.',
  },
}

/** Records a purchase or a sale of an Asset in an investment Account. */
export function Trade({ kind }: { kind: TradeKind }) {
  const { csrfToken } = useSignedInUser()
  const navigate = useNavigate()
  const { state, retry } = useLoaded(async () => tradingAccounts(await listAccounts()))

  return (
    <>
      <ScreenHeader title={headings[kind].title} back={positionsBack} intro={headings[kind].intro} />
      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Cuentas…" />
      ) : state.value.length === 0 ? (
        <section className={`${cardClassName} max-w-[34rem]`}>
          <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <h2 className="mt-4 mb-2 text-[1.2rem] font-semibold tracking-[-0.01em]">Primero necesitas una Cuenta de inversión</h2>
          <p className="text-ink-2">
            Una compra o una venta se registra en el efectivo de tu bróker. Crea esa Cuenta y vuelve aquí.
          </p>
          <Link to="/accounts/create" className={`${primaryButtonClassName} mt-4`}>
            Crear cuenta
          </Link>
        </section>
      ) : (
        <TradeEditor
          kind={kind}
          initial={{ accountId: state.value[0].id, asset: null, units: '', unitPrice: '', date: todayInPanama() }}
          accounts={state.value}
          save={(trade) => recordTrade(kind, trade, csrfToken)}
          onSaved={(trade, asset) => {
            const account = state.value.find((candidate) => candidate.id === trade.accountId)
            const notice: ScreenNotice = {
              notice: tradeNotice('created', trade, asset, { name: account?.name ?? 'la Cuenta', balance: trade.accountBalance }),
            }
            navigate(positionsBack.to, { state: notice })
          }}
        />
      )}
    </>
  )
}
