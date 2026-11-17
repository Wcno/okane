import { ArrowLeft, Hammer } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { allDestinations } from '../navigation'

/** Placeholder for the routes in docs/matrices.md that have no implemented screen yet. */
export function UnderConstruction() {
  const { pathname } = useLocation()
  const destination = allDestinations.find((candidate) => candidate.path === pathname)
  const title = destination?.name ?? 'Esta página no existe'
  useDocumentTitle(title)

  return (
    <>
      <header className="mb-5 lg:mb-7 lg:pr-48">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">
          {title}
        </h1>
      </header>

      <section className="rounded-card border border-line bg-surface p-6 shadow-card lg:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <Hammer size={20} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[1.2rem] font-semibold tracking-[-0.01em]">
          {destination ? 'Esta pantalla todavía no está construida' : 'No hay nada en esta dirección'}
        </h2>
        <p className="mt-2 max-w-[60ch] text-ink-2">
          {destination
            ? `El Panel es la primera pantalla de Okane. ${destination.name} se construirá con el mismo diseño, siguiendo los casos de uso de docs/matrices.md.`
            : 'Revisa la dirección o vuelve al Panel para seguir desde ahí.'}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-line-strong pl-3.5 pr-4.5 text-[0.95rem] font-semibold transition-colors duration-150 hover:bg-surface-2"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Volver al Panel
        </Link>
      </section>
    </>
  )
}
