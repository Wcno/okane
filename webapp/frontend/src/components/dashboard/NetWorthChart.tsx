import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { monthNames } from '../../data/months'
import type { NetWorthPoint } from '../../data/sample'
import { formatMoney, formatCompactMoney } from '../../lib/money'

const HEIGHT = 200
const MARGIN = { top: 14, right: 12, bottom: 26, left: 40 }

/** Monthly Net Worth. The card title names the single series; pointer and keyboard interaction expose its monthly components. */
export function NetWorthChart({ series }: { series: NetWorthPoint[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const gradientId = useId()

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const values = series.map((point) => point.netWorth)
  const minimum = Math.floor(Math.min(...values) / 1000) * 1000
  const maximum = Math.ceil(Math.max(...values) / 1000) * 1000
  const ticks: number[] = []
  for (let tick = minimum; tick <= maximum; tick += 1000) ticks.push(tick)

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const x = (index: number) => MARGIN.left + (index / (series.length - 1)) * plotWidth
  const y = (value: number) =>
    MARGIN.top + (1 - (value - minimum) / (maximum - minimum)) * plotHeight

  const line = series.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.netWorth)}`).join(' ')
  const base = MARGIN.top + plotHeight
  const area = `${line} L${x(series.length - 1)},${base} L${x(0)},${base} Z`

  const lastIndex = series.length - 1
  const selectedIndex = activeIndex ?? lastIndex
  const point = series[selectedIndex]

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relative = (event.clientX - bounds.left - MARGIN.left) / plotWidth
    setActiveIndex(Math.max(0, Math.min(lastIndex, Math.round(relative * lastIndex))))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const fromIndex = activeIndex ?? lastIndex
    setActiveIndex(Math.max(0, Math.min(lastIndex, fromIndex + (event.key === 'ArrowLeft' ? -1 : 1))))
  }

  // Place the tooltip beside the point; switch sides when it does not fit on the right.
  const tooltipWidth = 184
  const gap = 14
  const fitsOnRight = x(selectedIndex) + gap + tooltipWidth <= width
  const tooltipLeft = Math.max(
    0,
    fitsOnRight ? x(selectedIndex) + gap : x(selectedIndex) - gap - tooltipWidth,
  )

  return (
    <div
      ref={container}
      tabIndex={0}
      role="group"
      aria-label="Evolución del Patrimonio por mes. Usa las flechas izquierda y derecha para recorrer los meses."
      onKeyDown={handleKeyDown}
      onBlur={() => setActiveIndex(null)}
      className="relative mt-4 rounded-xl"
    >
      {activeIndex !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.87rem] shadow-float"
          style={{ left: tooltipLeft, width: tooltipWidth }}
        >
          <p className="font-semibold">
            {monthNames[point.month]}
            {selectedIndex === lastIndex ? ', hasta hoy' : ''}
          </p>
          <dl className="mt-1.5 space-y-0.5 text-ink-2">
            <div className="flex justify-between gap-3">
              <dt>Patrimonio</dt>
              <dd className="font-semibold tabular-nums text-ink">{formatMoney(point.netWorth)}</dd>
            </div>
            {selectedIndex > 0 && (
              <>
                <div className="flex justify-between gap-3">
                  <dt>Ahorro neto</dt>
                  <dd className="tabular-nums">{formatMoney(point.netSavings, { sign: true })}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Rendimiento</dt>
                  <dd className="tabular-nums">{formatMoney(point.investmentReturn, { sign: true })}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}

      <svg
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Patrimonio de ${monthNames[series[0].month].toLowerCase()} a ${monthNames[series[lastIndex].month].toLowerCase()}: de ${formatMoney(series[0].netWorth)} a ${formatMoney(series[lastIndex].netWorth)}.`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        onPointerLeave={() => setActiveIndex(null)}
        className="block touch-pan-y select-none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--series)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {width > 0 && (
          <>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--line)"
                  strokeWidth="1"
                />
                <text
                  x={MARGIN.left - 10}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-ink-3 text-[11.5px] tabular-nums"
                >
                  {formatCompactMoney(tick)}
                </text>
              </g>
            ))}

            {series.map((entry, index) => (
              <text
                key={entry.month}
                x={x(index)}
                y={HEIGHT - 6}
                textAnchor={index === 0 ? 'start' : index === lastIndex ? 'end' : 'middle'}
                className={`text-[11.5px] ${index === selectedIndex ? 'fill-ink font-semibold' : 'fill-ink-3'}`}
              >
                {entry.month}
              </text>
            ))}

            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill="none"
              stroke="var(--series)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {activeIndex !== null && (
              <line
                x1={x(selectedIndex)}
                x2={x(selectedIndex)}
                y1={MARGIN.top}
                y2={base}
                stroke="var(--line-strong)"
                strokeWidth="1"
              />
            )}
            <circle
              cx={x(selectedIndex)}
              cy={y(point.netWorth)}
              r="5"
              fill="var(--series)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  )
}
