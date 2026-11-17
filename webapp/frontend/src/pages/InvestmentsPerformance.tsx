import { ChartLine } from 'lucide-react'
import { Card } from '../components/dashboard/Card'
import { Figure, HeroMoney, ReturnLine } from '../components/investments/Figures'
import { PeriodCard } from '../components/investments/PeriodCard'
import { EmptyState, Pending, ScreenHeader } from '../components/screen/Screen'
import { getPerformance } from '../investments/portfolio'
import { dashboardBack, describeAsset, formatPercent, priceOrigin } from '../investments/presentation'
import { formatMoney } from '../lib/money'
import { useLoaded } from '../lib/useLoaded'

const intro = 'Lo que tu portafolio ha ganado o perdido desde que empezaste, sobre lo que has puesto en él.'

const back = { to: dashboardBack.to, label: dashboardBack.label }

/** The cumulative Return of the portfolio, of each investment Account and of each Position. */
export function InvestmentsPerformance() {
  const { state, retry } = useLoaded(getPerformance)

  if (state.status !== 'ready') {
    return (
      <>
        <ScreenHeader title="Rendimiento" intro={intro} back={back} />
        <Pending state={state} retry={retry} loading="Cargando tu Rendimiento…" />
      </>
    )
  }

  const performance = state.value
  if (performance.accounts.length === 0) {
    return (
      <>
        <ScreenHeader title="Rendimiento" intro={intro} back={back} />
        <EmptyState
          icon={ChartLine}
          title="Aún no hay Rendimiento que mostrar"
          text="El Rendimiento compara el valor de tu Cuenta de inversión con lo que has aportado. Crea esa Cuenta para empezar."
          action={{ to: '/accounts/create', label: 'Crear cuenta' }}
        />
      </>
    )
  }

  return (
    <>
      <ScreenHeader title="Rendimiento" intro={intro} back={back} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
          <Card id="return" title="Rendimiento acumulado">
            <HeroMoney amount={performance.return.amount} />
            <div className="mt-3.5">
              <ReturnLine value={performance.return} />
            </div>
            {performance.return.percent === null && (
              <p className="mt-2 max-w-[52ch] text-[0.87rem] text-ink-3">
                El porcentaje no aplica: tu Aporte neto no es mayor que cero.
              </p>
            )}
            <dl className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
              <Figure label="Valor actual" hint="Efectivo más Posiciones">
                {formatMoney(performance.value)}
              </Figure>
              <Figure label="Aporte neto" hint="Incluye el Saldo inicial como primer Aporte">
                {formatMoney(performance.netContribution)}
              </Figure>
            </dl>
            {performance.estimated && (
              <p className="mt-4 max-w-[52ch] text-[0.87rem] text-ink-3">
                Algunos precios son estimados: vienen de tu última operación, no de un precio fijado por ti.
              </p>
            )}
          </Card>

          <PeriodCard />

          <Card id="return-by-account" title="Por Cuenta">
            <ul className="mt-2 divide-y divide-line">
              {performance.accounts.map((account) => (
                <li key={account.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 break-words font-medium">
                      {account.name}
                      {account.archived && <span className="font-normal text-ink-3"> · Archivada</span>}
                    </p>
                    <ReturnLine value={account.return} />
                  </div>
                  <p className="mt-0.5 text-[0.87rem] leading-snug text-ink-3">
                    Valor {formatMoney(account.value)} · Aporte neto {formatMoney(account.netContribution)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <Card id="return-by-position" title="Por Posición" link={{ to: '/investments/positions', text: 'Posiciones' }}>
            {performance.positions.length === 0 ? (
              <p className="mt-3 text-ink-2">Aún no tienes Posiciones abiertas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {performance.positions.map((position) => (
                  <li key={position.asset.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <p className="min-w-0 flex-1 break-words font-medium">{describeAsset(position.asset)}</p>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold tabular-nums">{formatMoney(position.value)}</p>
                        <p className="text-[0.87rem] tabular-nums text-ink-3">
                          {formatMoney(position.gain, { sign: true })} ({formatPercent(position.gainPercent)})
                        </p>
                      </div>
                    </div>
                    <p className="mt-0.5 text-[0.87rem] leading-snug text-ink-3">
                      Costo {formatMoney(position.cost)} · {priceOrigin(position.price)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
