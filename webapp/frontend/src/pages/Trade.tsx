import { Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listAccounts } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { TradeEditor } from '../components/investments/TradeEditor'
import { EmptyState, Pending, ScreenHeader } from '../components/screen/Screen'
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
  dividend: {
    title: 'Registrar dividendo',
    intro: 'Anota el efectivo que te pagó un Activo que tienes. Entra en la Cuenta de inversión y cuenta como Rendimiento, no como Aporte.',
  },
}

/** Records a purchase, a sale or a Dividend of an Asset in an investment Account. */
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
        <EmptyState
          icon={Wallet}
          title="Necesitas una Cuenta de inversión"
          text="Una compra, una venta o un dividendo se registra en el efectivo de tu bróker. Crea esa Cuenta y vuelve aquí."
          action={{ to: '/accounts/create', label: 'Crear cuenta' }}
        />
      ) : (
        <TradeEditor
          kind={kind}
          initial={{ accountId: state.value[0].id, asset: null, units: '', unitPrice: '', commission: '', amount: '', date: todayInPanama() }}
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
