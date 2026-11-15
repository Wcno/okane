import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  id: string
  title: string
  /** Link to the screen that manages the information summarized by this card. */
  link?: { to: string; text: string }
  children: ReactNode
}

export function Card({ id, title, link, children }: Props) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-card border border-line bg-surface p-5 shadow-card lg:p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="text-[1rem] font-medium text-ink-2">
          {title}
        </h2>
        {link && (
          <Link
            to={link.to}
            className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-md text-[0.9rem] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
          >
            {link.text}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
