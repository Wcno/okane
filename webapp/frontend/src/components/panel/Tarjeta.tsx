import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  id: string
  titulo: string
  /** Enlace a la pantalla donde se gestiona lo que la tarjeta resume. */
  enlace?: { a: string; texto: string }
  children: ReactNode
}

export function Tarjeta({ id, titulo, enlace, children }: Props) {
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="rounded-card border border-line bg-surface p-5 shadow-card lg:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-titulo`} className="text-[1rem] font-medium text-ink-2">
          {titulo}
        </h2>
        {enlace && (
          <Link
            to={enlace.a}
            className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-md text-[0.9rem] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
          >
            {enlace.texto}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
