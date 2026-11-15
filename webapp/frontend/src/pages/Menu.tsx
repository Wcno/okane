import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { grupos } from '../navegacion'

/** "Más" en el teléfono: todas las secciones que no caben en la barra inferior. */
export function Menu() {
  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em]">Secciones</h1>
      </header>

      <div className="space-y-5">
        {grupos.map((grupo) => (
          <section key={grupo.titulo ?? 'inicio'} aria-label={grupo.titulo ?? 'Inicio'}>
            {grupo.titulo && (
              <h2 className="mb-2 px-1 text-[0.9rem] font-medium text-ink-3">{grupo.titulo}</h2>
            )}
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {grupo.destinos.map((destino) => {
                const Icono = destino.icono
                return (
                  <li key={destino.ruta}>
                    <Link
                      to={destino.ruta}
                      className="flex h-14 items-center gap-3.5 px-4 text-[1rem] font-medium transition-colors duration-150 hover:bg-surface-2"
                    >
                      <Icono size={20} className="text-ink-2" aria-hidden="true" />
                      <span className="flex-1">{destino.nombre}</span>
                      <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
