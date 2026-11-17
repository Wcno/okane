import { Link } from 'react-router-dom'
import type { InvestmentsDashboard } from '../../investments/portfolio'
import { describeAsset, distributionTone, priceOrigin } from '../../investments/presentation'
import { formatMoney } from '../../lib/money'
import { Card } from '../dashboard/Card'

const NEUTRAL = 'var(--cat-0)'

const share = (percent: string | null) => (percent === null ? 'No aplica' : `${percent} %`)

/**
 * How the value of the Positions splits across Assets: one segmented bar and, under it, the
 * legend that is also the table view, with each Asset's value, share and price origin.
 * An Asset keeps its hue by its place among the Assets shown in order of id, not by its rank.
 */
export function DistributionCard({ dashboard }: { dashboard: InvestmentsDashboard }) {
  const { distribution, othersValue, othersPercent } = dashboard
  const ids = distribution.map((item) => item.asset.id).sort((first, second) => first - second)
  const tones = distribution.map((item) => distributionTone(ids.indexOf(item.asset.id)))
  const parts = [
    ...distribution.map((item, index) => ({ key: item.asset.id, value: item.value, tone: tones[index] })),
    ...(othersValue === null ? [] : [{ key: 'others', value: othersValue, tone: NEUTRAL }]),
  ]
  const total = parts.reduce((sum, part) => sum + Number(part.value), 0)

  return (
    <Card id="distribution" title="Distribución por Activo" link={{ to: '/investments/positions', text: 'Posiciones' }}>
      {distribution.length === 0 ? (
        <p className="mt-3 text-ink-2">
          Aún no tienes Posiciones. Cuando registres una compra, aquí verás cómo se reparte su valor.
        </p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {parts.map((part) => (
              <span
                key={part.key}
                className="h-full min-w-1 rounded-full"
                style={{ flexGrow: Number(part.value) / total, flexBasis: 0, backgroundColor: part.tone }}
              />
            ))}
          </div>
          <ul aria-label="Valor de cada Activo" className="mt-3 divide-y divide-line">
            {distribution.map((item, index) => (
              <li key={item.asset.id} className="flex items-start gap-3 py-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tones[index] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{describeAsset(item.asset)}</p>
                  <p className="break-words text-[0.87rem] leading-snug text-ink-3">{priceOrigin(item.price)}</p>
                  <Link
                    to={`/investments/assets/${item.asset.id}/price`}
                    className="inline-flex min-h-[44px] items-center text-[0.87rem] font-medium text-ink-2 underline underline-offset-2 hover:text-ink"
                  >
                    Corregir precio de {item.asset.symbol}
                  </Link>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{formatMoney(item.value)}</p>
                  <p className="text-[0.87rem] text-ink-3">
                    <span className="sr-only">Porcentaje del portafolio: </span>
                    {share(item.portfolioPercent)}
                  </p>
                </div>
              </li>
            ))}
            {othersValue !== null && (
              <li className="flex items-start gap-3 py-3">
                <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: NEUTRAL }} />
                <p className="min-w-0 flex-1 font-medium">Otros Activos</p>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{formatMoney(othersValue)}</p>
                  <p className="text-[0.87rem] text-ink-3">
                    <span className="sr-only">Porcentaje del portafolio: </span>
                    {share(othersPercent)}
                  </p>
                </div>
              </li>
            )}
          </ul>
        </>
      )}
    </Card>
  )
}
