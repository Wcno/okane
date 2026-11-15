import { Cuentas } from '../components/panel/Cuentas'
import { Disponible } from '../components/panel/Disponible'
import { PagosPorVencer } from '../components/panel/PagosPorVencer'
import { Patrimonio } from '../components/panel/Patrimonio'
import { RestantePorCategoria } from '../components/panel/RestantePorCategoria'
import { diasRestantes, hoy } from '../data/sample'

/** Pantalla de inicio: las dos respuestas del producto y lo que las explica. */
export function Panel() {
  const mes = hoy.mes.charAt(0).toUpperCase() + hoy.mes.slice(1)

  return (
    <>
      <header className="mb-5 lg:mb-7 lg:pr-48">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">
          {mes} de {hoy.anio}
        </h1>
        <p className="mt-0.5 text-ink-2">
          Domingo {hoy.dia} · quedan {diasRestantes} días del mes
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4 lg:col-span-7 lg:space-y-5">
          <Disponible />
          <RestantePorCategoria />
        </div>
        <div className="min-w-0 space-y-4 lg:col-span-5 lg:space-y-5">
          <Patrimonio />
          <PagosPorVencer />
          <Cuentas />
        </div>
      </div>

      <p className="mt-6 text-center text-[0.87rem] text-ink-3 lg:hidden">
        Estás viendo datos de ejemplo.
      </p>
    </>
  )
}
