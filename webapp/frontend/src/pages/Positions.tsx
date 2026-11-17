import { ChartLine, History, TrendingDown } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { smallSecondaryButtonClassName } from '../components/buttons'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { listPositions, type Position } from '../investments/api'
import { describeAsset, formatPrice, formatUnits, unitsPhrase } from '../investments/presentation'
import { formatDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'
import { useLoaded } from '../lib/useLoaded'

function Row({ position }: { position: Position }) {
  const { asset, accounts } = position
  const share = position.portfolioPercent === null ? 'No aplica' : `${position.portfolioPercent} %`
  const holding = `${unitsPhrase(position.units)} · costo promedio ${formatPrice(position.averageCost)}`
  const price = `Precio ${formatPrice(position.price.value)} de tu última operación, ${formatDay(position.price.date)}`

  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[1rem] font-medium">{describeAsset(asset)}</h3>
          <p className="mt-0.5 break-words text-[0.87rem] leading-snug text-ink-3">{holding}</p>
          <p className="break-words text-[0.87rem] leading-snug text-ink-3">{price}</p>
          {accounts.length > 1 && (
            <p className="mt-0.5 break-words text-[0.87rem] leading-snug text-ink-3">
              En {accounts.length} Cuentas:{' '}
              {accounts.map((item) => `${item.accountName} ${formatUnits(item.units)}`).join(' · ')}
            </p>
          )}
          <Link
            to="/investments/transactions/sell"
            aria-label={`Vender ${asset.symbol}`}
            className={`${smallSecondaryButtonClassName} mt-2`}
          >
            <TrendingDown size={17} aria-hidden="true" />
            Vender
          </Link>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[1rem] font-semibold tabular-nums">{formatMoney(position.value)}</p>
          <p className="mt-0.5 text-[0.87rem] text-ink-3">
            <span className="sr-only">Porcentaje del portafolio: </span>
            {share}
          </p>
        </div>
      </div>
    </li>
  )
}

/** What the User holds of each Asset, grouped across Accounts, with its cost, value and share of the portfolio. */
export function Positions() {
  const { state, retry } = useLoaded(listPositions)
  const notice = noticeFrom(useLocation().state)
  const hasPositions = state.status === 'ready' && state.value.length > 0

  return (
    <>
      <ScreenHeader
        title="Posiciones"
        intro="Lo que tienes de cada Activo, con su costo promedio y su valor según la última operación que registraste."
        // With nothing held, the empty state already asks for the first purchase.
        action={hasPositions ? { to: '/investments/transactions/buy', label: 'Registrar compra' } : undefined}
      />

      <div className="mb-5 lg:mb-6">
        <Link to="/investments/transactions" className={smallSecondaryButtonClassName}>
          <History size={17} aria-hidden="true" />
          Ver transacciones
        </Link>
      </div>

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus Posiciones…" />
      ) : state.value.length === 0 ? (
        <EmptyState
          icon={ChartLine}
          title="Aún no tienes Posiciones"
          text="Registra la compra de un Activo en tu Cuenta de inversión y aparecerá aquí con su costo promedio y su valor."
          action={{ to: '/investments/transactions/buy', label: 'Registrar tu primera compra' }}
        />
      ) : (
        <section aria-label="Posiciones" className={`${cardClassName} max-w-[44rem]`}>
          <ul className="divide-y divide-line">
            {state.value.map((position) => (
              <Row key={position.asset.id} position={position} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
