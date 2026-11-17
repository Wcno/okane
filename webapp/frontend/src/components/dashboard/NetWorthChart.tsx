import { useState } from 'react'
import { formatMoney } from '../../lib/money'
import { shortMonthName } from '../../lib/months'
import { chartPoints, guideLines, labelledIndexes, type ChartBox } from '../../netWorth/chart'
import type { NetWorthPeriod } from '../../netWorth/api'

const BOX: ChartBox = {
  width: 360,
  height: 190,
  left: 46,
  right: 14,
  top: 12,
  bottom: 28,
}
const MAX_LABELS = 6

/** Whole dollars with thousands, short enough for the guide labels. */
const guideLabel = (value: number) => `${value < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`

/**
 * The Patrimonio at the close of each month as one line. An empty point marks a month
 * whose prices are estimated; the table view carries the same figures for a screen reader.
 */
export function NetWorthChart({ periods }: { periods: NetWorthPeriod[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const values = periods.map((period) => Number(period.netWorth))
  const points = chartPoints(values, BOX)
  const guides = guideLines(values, BOX)
  const labelled = new Set(labelledIndexes(periods.length, MAX_LABELS))
  const shown = periods[hovered ?? periods.length - 1]
  const step = periods.length > 1 ? (BOX.width - BOX.left - BOX.right) / (periods.length - 1) : BOX.width
  const anyEstimated = periods.some((period) => period.estimated)

  return (
    <div>
      <p className="text-[0.95rem] text-ink-2" aria-live="polite">
        <span className="font-medium text-ink">{shortMonthName(shown.month)}</span>
        {': '}
        <span className="font-semibold tabular-nums text-ink">{formatMoney(shown.netWorth)}</span>
        {shown.estimated && ' (estimado)'}
      </p>
      <svg
        viewBox={`0 0 ${BOX.width} ${BOX.height}`}
        role="img"
        aria-label={`Evolución mensual del Patrimonio de ${shortMonthName(periods[0].month)} a ${shortMonthName(periods[periods.length - 1].month)}. La vista de tabla trae las mismas cifras.`}
        className="mt-2 h-auto w-full"
        onPointerLeave={() => setHovered(null)}
      >
        {guides.map(({ value, y }) => (
          <g key={y}>
            <line x1={BOX.left} x2={BOX.width - BOX.right} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
            <text x={BOX.left - 6} y={y + 4} textAnchor="end" className="fill-ink-3" fontSize={11}>
              {guideLabel(value)}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <polyline
            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            className="stroke-series"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((point, index) => (
          <g key={periods[index].month}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hovered === index ? 5.5 : 4}
              strokeWidth={2}
              className={periods[index].estimated ? 'fill-surface stroke-series' : 'fill-series stroke-surface'}
            />
            {labelled.has(index) && (
              <text
                x={point.x}
                y={BOX.height - 8}
                textAnchor={
                  index === 0 && points.length > 1
                    ? 'start'
                    : index === points.length - 1 && points.length > 1
                      ? 'end'
                      : 'middle'
                }
                className="fill-ink-3"
                fontSize={11}
              >
                {shortMonthName(periods[index].month)}
              </text>
            )}
            <rect
              x={point.x - step / 2}
              y={0}
              width={step}
              height={BOX.height}
              fill="transparent"
              onPointerEnter={() => setHovered(index)}
            />
          </g>
        ))}
      </svg>
      {anyEstimated && (
        <p className="mt-1 text-[0.85rem] text-ink-3">Punto vacío: algún precio de ese mes es estimado.</p>
      )}
    </div>
  )
}
