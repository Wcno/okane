import { X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { categoriaPorNombre, categorias } from '../data/categorias'
import { cuentasParaGastos, hoy, restante } from '../data/sample'
import { dinero } from '../lib/dinero'
import { useDatos } from '../state/store'

const FECHA_DE_HOY = `${hoy.anio}-11-${String(hoy.dia).padStart(2, '0')}`

const leerMonto = (texto: string) => {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  const monto = Number(limpio)
  return monto > 0 ? monto : null
}

const campo =
  'h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 hover:border-ink-3 focus-visible:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

/**
 * Registro rápido de un Gasto, accesible desde cualquier pantalla. Solo exige
 * monto y Categoría: la fecha parte en hoy y la Cuenta en la última usada.
 */
export function RegistrarGasto() {
  const { estado, ultimaCuentaId, registrar, formularioAbierto, cerrarFormulario } = useDatos()
  const dialogo = useRef<HTMLDialogElement>(null)
  const campoMonto = useRef<HTMLInputElement>(null)

  const [textoMonto, setTextoMonto] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [cuentaId, setCuentaId] = useState(ultimaCuentaId)
  const [fecha, setFecha] = useState(FECHA_DE_HOY)
  const [descripcion, setDescripcion] = useState('')
  const [intentado, setIntentado] = useState(false)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (formularioAbierto && !elemento.open) {
      setTextoMonto('')
      setCategoria(null)
      setCuentaId(ultimaCuentaId)
      setFecha(FECHA_DE_HOY)
      setDescripcion('')
      setIntentado(false)
      elemento.showModal()
      campoMonto.current?.focus()
    } else if (!formularioAbierto && elemento.open) {
      elemento.close()
    }
  }, [formularioAbierto, ultimaCuentaId])

  const monto = leerMonto(textoMonto)
  const errorMonto = intentado && monto === null
  const errorCategoria = intentado && categoria === null

  const linea = estado.presupuestos.find((presupuesto) => presupuesto.categoria === categoria)
  const restanteActual = linea ? restante(linea) : null
  const restanteNuevo =
    restanteActual !== null && monto !== null ? Math.round((restanteActual - monto) * 100) / 100 : null

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setIntentado(true)
    if (monto === null || categoria === null) {
      if (monto === null) campoMonto.current?.focus()
      return
    }
    const consecuencia =
      restanteNuevo === null
        ? `${categoria} no tiene Presupuesto este mes.`
        : restanteNuevo < 0
          ? `${categoria} queda excedida por ${dinero(-restanteNuevo)}.`
          : `Restante en ${categoria}: ${dinero(restanteNuevo)}.`
    registrar({ monto, categoria, cuentaId }, `Gasto de ${dinero(monto)} registrado. ${consecuencia}`)
    cerrarFormulario()
  }

  return (
    <dialog
      ref={dialogo}
      onClose={cerrarFormulario}
      onClick={(evento) => {
        if (evento.target === dialogo.current) cerrarFormulario()
      }}
      aria-labelledby="registrar-gasto-titulo"
      className="hoja mx-0 mb-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[1.75rem] bg-surface text-ink shadow-float sm:m-auto sm:w-[30rem] sm:rounded-[1.75rem]"
    >
      <form onSubmit={enviar} noValidate className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7 sm:pt-6">
        <div className="flex items-center justify-between">
          <h2 id="registrar-gasto-titulo" className="text-[1.25rem] font-semibold tracking-[-0.01em]">
            Registrar gasto
          </h2>
          <button
            type="button"
            onClick={cerrarFormulario}
            aria-label="Cerrar"
            className="-mr-2 grid size-9 place-items-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor="gasto-monto" className="text-[0.9rem] font-medium text-ink-2">
            Monto
          </label>
          <div
            className={`mt-1.5 flex items-baseline gap-1 rounded-2xl border bg-surface px-4 py-2.5 transition-colors duration-150 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15 ${
              errorMonto ? 'border-critical' : 'border-line-strong hover:border-ink-3'
            }`}
          >
            <span className="text-[1.6rem] font-semibold text-ink-3" aria-hidden="true">
              $
            </span>
            <input
              ref={campoMonto}
              id="gasto-monto"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={textoMonto}
              onChange={(evento) => setTextoMonto(evento.target.value)}
              aria-invalid={errorMonto}
              aria-describedby={errorMonto ? 'gasto-monto-error' : undefined}
              className="w-full min-w-0 bg-transparent text-[2rem] font-semibold tracking-[-0.02em] placeholder:text-ink-3/60 focus-visible:outline-none"
            />
          </div>
          {errorMonto && (
            <p id="gasto-monto-error" className="mt-1.5 text-[0.9rem] text-critical">
              Escribe un monto mayor que cero, con dos decimales como máximo. Ejemplo: 12.50
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-[0.9rem] font-medium text-ink-2">Categoría</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {categorias.map((opcion) => {
              const Icono = opcion.icono
              const elegida = categoria === opcion.nombre
              return (
                <label
                  key={opcion.nombre}
                  style={{ '--tono': opcion.tono } as CSSProperties}
                  className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-2xl border p-1.5 pr-3 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                    elegida ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2'
                  }`}
                >
                  <input
                    type="radio"
                    name="categoria"
                    value={opcion.nombre}
                    checked={elegida}
                    onChange={() => setCategoria(opcion.nombre)}
                    className="sr-only"
                  />
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--tono)_15%,transparent)] text-(--tono)">
                    <Icono size={18} aria-hidden="true" />
                  </span>
                  <span
                    className={`min-w-0 truncate text-[0.93rem] ${
                      elegida ? 'font-semibold text-ink' : 'font-medium text-ink-2'
                    }`}
                  >
                    {opcion.nombre}
                  </span>
                </label>
              )
            })}
          </div>
          {errorCategoria && (
            <p className="mt-1.5 text-[0.9rem] text-critical">Elige la Categoría del gasto.</p>
          )}
        </fieldset>

        <p className="mt-3 min-h-[1.4em] text-[0.9rem] text-ink-2" aria-live="polite">
          {categoria !== null &&
            monto !== null &&
            (restanteActual === null || restanteNuevo === null
              ? `${categoria} no tiene Presupuesto este mes; el gasto se registra igual.`
              : restanteNuevo < 0
                ? `${categoria} quedará excedida por ${dinero(-restanteNuevo)}; el gasto se registra igual.`
                : `Restante en ${categoria}: de ${dinero(restanteActual)} a ${dinero(restanteNuevo)}.`)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gasto-cuenta" className="text-[0.9rem] font-medium text-ink-2">
              Cuenta
            </label>
            <select
              id="gasto-cuenta"
              value={cuentaId}
              onChange={(evento) => setCuentaId(evento.target.value)}
              className={`${campo} mt-1.5`}
            >
              {cuentasParaGastos(estado).map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="gasto-fecha" className="text-[0.9rem] font-medium text-ink-2">
              Fecha
            </label>
            <input
              id="gasto-fecha"
              type="date"
              value={fecha}
              max={FECHA_DE_HOY}
              onChange={(evento) => setFecha(evento.target.value)}
              className={`${campo} mt-1.5`}
            />
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="gasto-descripcion" className="text-[0.9rem] font-medium text-ink-2">
            Descripción <span className="font-normal text-ink-3">(opcional)</span>
          </label>
          <input
            id="gasto-descripcion"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            autoComplete="off"
            placeholder="Supermercado, taxi, farmacia"
            className={`${campo} mt-1.5 placeholder:text-ink-3`}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={cerrarFormulario}
            className="h-12 flex-1 rounded-full border border-line-strong text-[1rem] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-12 flex-[1.6] rounded-full bg-primary text-[1rem] font-semibold text-on-primary transition-transform duration-150 active:scale-[0.98]"
          >
            Registrar gasto
            {monto !== null && categoria !== null && (
              <span className="sr-only">
                {' '}
                de {dinero(monto)} en {categoriaPorNombre(categoria).nombre}
              </span>
            )}
          </button>
        </div>
      </form>
    </dialog>
  )
}
