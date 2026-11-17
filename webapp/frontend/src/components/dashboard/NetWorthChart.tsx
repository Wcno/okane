import { useId, useState, type KeyboardEvent } from 'react'
import { formatMoney } from '../../lib/money'
import { shortMonthName } from '../../lib/months'
import type { NetWorthPeriod } from '../../netWorth/api'
import {
  chartPoints,
  compactMoney,
  guideLines,
  labelledIndexes,
  steppedIndex,
  type ChartBox,
} from '../../netWorth/chart'

const BOX: ChartBox = { width: 360, height: 190, left: 44, right: 16, top: 12, bottom: 28 }
const MAX_LABELS = 6
const TAG = { width: 96, height: 38, gap: 12 }

/**
 * The Patrimonio at the close of each month as one line over a soft area. The last month
 * is marked; hovering or walking with the arrow keys draws a vertical line and a label
 * beside the point. A hollow point is a month whose close rests on an estimated price.
 * The table view carries the same figures.
 */
export function NetWorthChart({ periods }: { periods: NetWorthPeriod[] }) {
  const gradientId = useId()
  const [active, setActive] = useState<number | null>(null)
  const values = periods.map((period) => Number(period.netWorth))
  const points = chartPoints(values, BOX)
  const guides = guideLines(values, BOX)
  const labelled = new Set(labelledIndexes(periods.length, MAX_LABELS))
  const lastIndex = periods.length - 1
  const step = periods.length > 1 ? (BOX.width - BOX.left - BOX.right) / lastIndex : BOX.width
  const floor = BOX.height - BOX.bottom
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${points[0].x},${floor} ${line} ${points[lastIndex].x},${floor}`
  const anyEstimated = periods.some((period) => period.estimated)
  const shown = active === null ? null : { period: periods[active], point: points[active] }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') return setActive(null)
    const next = steppedIndex(active ?? lastIndex, event.key, periods.length)
    if (next === (active ?? lastIndex) && !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    setActive(next)
  }

  const tagX = shown
    ? shown.point.x > BOX.width / 2
      ? shown.point.x - TAG.gap - TAG.width
      : shown.point.x + TAG.gap
    : 0
  const tagY = shown ? Math.min(Math.max(shown.point.y - TAG.height / 2, BOX.top), floor - TAG.height) : 0

  return (
    <div>
      <div
        role="group"
        tabIndex={0}
        aria-roledescription="gráfico"
        aria-label={`Evolución mensual del Patrimonio de ${shortMonthName(periods[0].month)} a ${shortMonthName(periods[lastIndex].month)}. Recorre los meses con las flechas, o abre la vista de tabla.`}
        onFocus={() => setActive((current) => current ?? lastIndex)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
        className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <svg
          viewBox={`0 0 ${BOX.width} ${BOX.height}`}
          aria-hidden="true"
          className="h-auto w-full"
          onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--series)" stopOpacity={0.16} />
              <stop offset="1" stopColor="var(--series)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {guides.map(({ value, y }) => (
            <g key={value}>
              <line x1={BOX.left} x2={BOX.width - BOX.right} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
              <text x={BOX.left - 6} y={y + 4} textAnchor="end" className="fill-ink-3" fontSize={11}>
                {compactMoney(value)}
              </text>
            </g>
          ))}
          {points.length > 1 && <polygon points={area} fill={`url(#${gradientId})`} />}
          {points.length > 1 && (
            <polyline
              points={line}
              fill="none"
              className="stroke-series"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {shown && (
            <line
              x1={shown.point.x}
              x2={shown.point.x}
              y1={BOX.top}
              y2={floor}
              className="stroke-ink-3"
              strokeWidth={1}
            />
          )}
          {points.map((point, index) => (
            <g key={periods[index].month}>
              {labelled.has(index) && (
                <text
                  x={point.x}
                  y={BOX.height - 8}
                  textAnchor={
                    points.length === 1 ? 'middle' : index === 0 ? 'start' : index === lastIndex ? 'end' : 'middle'
                  }
                  className="fill-ink-3"
                  fontSize={11}
                >
                  {shortMonthName(periods[index].month)}
                </text>
              )}
              {periods[index].estimated && index !== lastIndex && index !== active && (
                <circle cx={point.x} cy={point.y} r={3.5} strokeWidth={2} className="fill-surface stroke-series" />
              )}
              <rect
                x={point.x - step / 2}
                y={0}
                width={step}
                height={BOX.height}
                fill="transparent"
                onPointerEnter={() => setActive(index)}
                onPointerDown={() => setActive(index)}
              />
            </g>
          ))}
          <EndPoint point={points[lastIndex]} estimated={periods[lastIndex].estimated} radius={5} />
          {shown && active !== lastIndex && (
            <EndPoint point={shown.point} estimated={shown.period.estimated} radius={4} />
          )}
          {shown && (
            <g pointerEvents="none">
              <rect
                x={tagX}
                y={tagY}
                width={TAG.width}
                height={TAG.height}
                rx={8}
                className="fill-surface stroke-line-strong"
              />
              <text x={tagX + 10} y={tagY + 15} className="fill-ink-3" fontSize={11}>
                {shortMonthName(shown.period.month)}
                {shown.period.estimated ? ' · estimado' : ''}
              </text>
              <text x={tagX + 10} y={tagY + 30} className="fill-ink" fontSize={12} fontWeight={600}>
                {formatMoney(shown.period.netWorth)}
              </text>
            </g>
          )}
        </svg>
      </div>
      <p className="sr-only" aria-live="polite">
        {shown ? `${shortMonthName(shown.period.month)}: ${formatMoney(shown.period.netWorth)}` : ''}
      </p>
      {anyEstimated && (
        <p className="mt-1 text-[0.85rem] text-ink-3">Punto vacío: el cierre de ese mes usa un precio estimado.</p>
      )}
    </div>
  )
}

/** A marked point: a ring of the surface colour around a dot, hollow when the price is an estimate. */
function EndPoint({
  point,
  estimated,
  radius,
}: {
  point: { x: number; y: number }
  estimated: boolean
  radius: number
}) {
  return (
    <g pointerEvents="none">
      <circle cx={point.x} cy={point.y} r={radius + 2} className="fill-surface" />
      <circle
        cx={point.x}
        cy={point.y}
        r={radius}
        strokeWidth={2}
        className={estimated ? 'fill-surface stroke-series' : 'fill-series stroke-series'}
      />
    </g>
  )
}
