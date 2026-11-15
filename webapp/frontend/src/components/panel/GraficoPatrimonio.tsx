import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { PuntoPatrimonio } from '../../data/sample'
import { dinero, dineroCompacto } from '../../lib/dinero'

const ALTO = 200
const MARGEN = { arriba: 14, derecha: 12, abajo: 26, izquierda: 40 }

export const nombreDeMes: Record<string, string> = {
  may: 'Mayo',
  jun: 'Junio',
  jul: 'Julio',
  ago: 'Agosto',
  sep: 'Septiembre',
  oct: 'Octubre',
  nov: 'Noviembre',
}

/**
 * Evolución mensual del Patrimonio. Una sola serie: el título de la tarjeta la
 * nombra, así que no lleva leyenda. Al pasar el cursor o moverse con las flechas
 * muestra el mes y los dos componentes de su variación.
 */
export function GraficoPatrimonio({ serie }: { serie: PuntoPatrimonio[] }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [activo, setActivo] = useState<number | null>(null)
  const idDegradado = useId()

  useEffect(() => {
    const elemento = contenedor.current
    if (!elemento) return
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  const valores = serie.map((punto) => punto.patrimonio)
  const minimo = Math.floor(Math.min(...valores) / 1000) * 1000
  const maximo = Math.ceil(Math.max(...valores) / 1000) * 1000
  const marcas: number[] = []
  for (let marca = minimo; marca <= maximo; marca += 1000) marcas.push(marca)

  const anchoUtil = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 1)
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo
  const x = (indice: number) => MARGEN.izquierda + (indice / (serie.length - 1)) * anchoUtil
  const y = (valor: number) =>
    MARGEN.arriba + (1 - (valor - minimo) / (maximo - minimo)) * altoUtil

  const linea = serie.map((punto, indice) => `${indice === 0 ? 'M' : 'L'}${x(indice)},${y(punto.patrimonio)}`).join(' ')
  const base = MARGEN.arriba + altoUtil
  const area = `${linea} L${x(serie.length - 1)},${base} L${x(0)},${base} Z`

  const ultimo = serie.length - 1
  const marcado = activo ?? ultimo
  const punto = serie[marcado]

  const alMover = (evento: PointerEvent<SVGSVGElement>) => {
    const caja = evento.currentTarget.getBoundingClientRect()
    const relativo = (evento.clientX - caja.left - MARGEN.izquierda) / anchoUtil
    setActivo(Math.max(0, Math.min(ultimo, Math.round(relativo * ultimo))))
  }

  const alTeclear = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return
    evento.preventDefault()
    const desde = activo ?? ultimo
    setActivo(Math.max(0, Math.min(ultimo, desde + (evento.key === 'ArrowLeft' ? -1 : 1))))
  }

  // La etiqueta va a un lado del punto, nunca encima: si no cabe a la derecha, pasa a la izquierda.
  const anchoEtiqueta = 184
  const separacion = 14
  const cabeALaDerecha = x(marcado) + separacion + anchoEtiqueta <= ancho
  const izquierdaEtiqueta = Math.max(
    0,
    cabeALaDerecha ? x(marcado) + separacion : x(marcado) - separacion - anchoEtiqueta,
  )

  return (
    <div
      ref={contenedor}
      tabIndex={0}
      role="group"
      aria-label="Evolución del Patrimonio por mes. Usa las flechas izquierda y derecha para recorrer los meses."
      onKeyDown={alTeclear}
      onBlur={() => setActivo(null)}
      className="relative mt-4 rounded-xl"
    >
      {activo !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.87rem] shadow-float"
          style={{ left: izquierdaEtiqueta, width: anchoEtiqueta }}
        >
          <p className="font-semibold">
            {nombreDeMes[punto.mes]}
            {marcado === ultimo ? ', hasta hoy' : ''}
          </p>
          <dl className="mt-1.5 space-y-0.5 text-ink-2">
            <div className="flex justify-between gap-3">
              <dt>Patrimonio</dt>
              <dd className="font-semibold tabular-nums text-ink">{dinero(punto.patrimonio)}</dd>
            </div>
            {marcado > 0 && (
              <>
                <div className="flex justify-between gap-3">
                  <dt>Ahorro neto</dt>
                  <dd className="tabular-nums">{dinero(punto.ahorroNeto, { signo: true })}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Rendimiento</dt>
                  <dd className="tabular-nums">{dinero(punto.rendimiento, { signo: true })}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}

      <svg
        width="100%"
        height={ALTO}
        role="img"
        aria-label={`Patrimonio de ${nombreDeMes[serie[0].mes].toLowerCase()} a ${nombreDeMes[serie[ultimo].mes].toLowerCase()}: de ${dinero(serie[0].patrimonio)} a ${dinero(serie[ultimo].patrimonio)}.`}
        onPointerMove={alMover}
        onPointerDown={alMover}
        onPointerLeave={() => setActivo(null)}
        className="block touch-pan-y select-none"
      >
        <defs>
          <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--series)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ancho > 0 && (
          <>
            {marcas.map((marca) => (
              <g key={marca}>
                <line
                  x1={MARGEN.izquierda}
                  x2={ancho - MARGEN.derecha}
                  y1={y(marca)}
                  y2={y(marca)}
                  stroke="var(--line)"
                  strokeWidth="1"
                />
                <text
                  x={MARGEN.izquierda - 10}
                  y={y(marca)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-ink-3 text-[11.5px] tabular-nums"
                >
                  {dineroCompacto(marca)}
                </text>
              </g>
            ))}

            {serie.map((dato, indice) => (
              <text
                key={dato.mes}
                x={x(indice)}
                y={ALTO - 6}
                textAnchor={indice === 0 ? 'start' : indice === ultimo ? 'end' : 'middle'}
                className={`text-[11.5px] ${indice === marcado ? 'fill-ink font-semibold' : 'fill-ink-3'}`}
              >
                {dato.mes}
              </text>
            ))}

            <path d={area} fill={`url(#${idDegradado})`} />
            <path
              d={linea}
              fill="none"
              stroke="var(--series)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {activo !== null && (
              <line
                x1={x(marcado)}
                x2={x(marcado)}
                y1={MARGEN.arriba}
                y2={base}
                stroke="var(--line-strong)"
                strokeWidth="1"
              />
            )}
            <circle
              cx={x(marcado)}
              cy={y(punto.patrimonio)}
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
