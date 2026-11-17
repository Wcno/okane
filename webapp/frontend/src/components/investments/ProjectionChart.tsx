import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ProjectedScenario } from '../../investments/projection'
import { scenarioName, scenarioTone } from '../../investments/projectionPresentation'
import { formatMoney } from '../../lib/money'

const HEIGHT = 220
const MARGIN = { top: 14, right: 14, bottom: 28, left: 52 }
const TOOLTIP_WIDTH = 196

/** A step of 1, 2, 2.5 or 5 times a power of ten that fits `maximum` in about four intervals. */
function niceStep(maximum: number) {
  const raw = maximum / 4
  const power = 10 ** Math.floor(Math.log10(raw))
  return ([1, 2, 2.5, 5, 10].find((factor) => factor * power >= raw) ?? 10) * power
}

const axisMoney = (value: number) => `$${value.toLocaleString('en-US')}`

/** Capital month by month for each scenario, from the initial capital at month 0. Shown also as a table by the screen. */
export function ProjectionChart({ scenarios }: { scenarios: ProjectedScenario[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [activeMonth, setActiveMonth] = useState<number | null>(null)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const lines = scenarios.map((scenario) => [
    Number(scenario.initialCapital),
    ...scenario.series.map((point) => Number(point.capital)),
  ])
  const lastMonth = Math.max(...scenarios.map((scenario) => scenario.months))
  const highest = Math.max(1, ...lines.flat())
  const step = niceStep(highest)
  const top = Math.ceil(highest / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const base = MARGIN.top + plotHeight
  const x = (month: number) => MARGIN.left + (month / lastMonth) * plotWidth
  const y = (value: number) => MARGIN.top + (1 - value / top) * plotHeight

  const monthTicks = [0, Math.round(lastMonth / 2), lastMonth].filter((month, index, all) => all.indexOf(month) === index)
  const selected = activeMonth ?? lastMonth

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relative = (event.clientX - bounds.left - MARGIN.left) / plotWidth
    setActiveMonth(Math.max(0, Math.min(lastMonth, Math.round(relative * lastMonth))))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const from = activeMonth ?? lastMonth
    setActiveMonth(Math.max(0, Math.min(lastMonth, from + (event.key === 'ArrowLeft' ? -1 : 1))))
  }

  const fitsOnRight = x(selected) + 14 + TOOLTIP_WIDTH <= width
  const tooltipLeft = Math.max(0, fitsOnRight ? x(selected) + 14 : x(selected) - 14 - TOOLTIP_WIDTH)

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.9rem] text-ink-2" aria-label="Escenarios del gráfico">
        {scenarios.map((_, position) => (
          <li key={position} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-5 rounded-full" style={{ background: scenarioTone(position) }} />
            {scenarioName(position)}
          </li>
        ))}
      </ul>
      <div
        ref={container}
        tabIndex={0}
        role="group"
        aria-label="Evolución mensual del capital de cada escenario. Usa las flechas izquierda y derecha para recorrer los meses."
        onKeyDown={handleKeyDown}
        onBlur={() => setActiveMonth(null)}
        className="relative rounded-xl"
      >
        {activeMonth !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.87rem] shadow-float"
            style={{ left: tooltipLeft, width: TOOLTIP_WIDTH }}
          >
            <p className="font-semibold">{selected === 0 ? 'Inicio' : `Mes ${selected}`}</p>
            <dl className="mt-1.5 space-y-0.5 text-ink-2">
              {scenarios.map((scenario, position) =>
                selected <= scenario.months ? (
                  <div key={position} className="flex justify-between gap-3">
                    <dt className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: scenarioTone(position) }} />
                      {scenarioName(position)}
                    </dt>
                    <dd className="font-semibold tabular-nums text-ink">{formatMoney(lines[position][selected].toFixed(2))}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </div>
        )}

        <svg
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={`Capital proyectado a ${lastMonth} meses: ${scenarios
            .map((scenario, position) => `${scenarioName(position)} termina en ${formatMoney(scenario.finalCapital)}`)
            .join('; ')}.`}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setActiveMonth(null)}
          className="block touch-pan-y select-none"
        >
          {width > 0 && (
            <>
              {ticks.map((tick) => (
                <g key={tick}>
                  <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeWidth="1" />
                  <text x={MARGIN.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-ink-3 text-[11.5px] tabular-nums">
                    {axisMoney(tick)}
                  </text>
                </g>
              ))}
              {monthTicks.map((month, index) => (
                <text
                  key={month}
                  x={x(month)}
                  y={HEIGHT - 8}
                  textAnchor={index === 0 ? 'start' : index === monthTicks.length - 1 ? 'end' : 'middle'}
                  className="fill-ink-3 text-[11.5px]"
                >
                  {month === 0 ? 'Inicio' : `Mes ${month}`}
                </text>
              ))}

              {lines.map((values, position) => (
                <path
                  key={position}
                  d={values.map((value, month) => `${month === 0 ? 'M' : 'L'}${x(month)},${y(value)}`).join(' ')}
                  fill="none"
                  stroke={scenarioTone(position)}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {activeMonth !== null && (
                <line x1={x(selected)} x2={x(selected)} y1={MARGIN.top} y2={base} stroke="var(--line-strong)" strokeWidth="1" />
              )}
              {lines.map((values, position) =>
                selected <= scenarios[position].months ? (
                  <circle
                    key={position}
                    cx={x(selected)}
                    cy={y(values[selected])}
                    r="5"
                    fill={scenarioTone(position)}
                    stroke="var(--surface)"
                    strokeWidth="2"
                  />
                ) : null,
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
