import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSignedInUser } from '../auth/context'
import { SignOutButton } from '../components/SignOutButton'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { navigationGroups, profileDestinations } from '../navigation'

/** Mobile More screen for destinations outside the bottom bar, and the session. */
export function Menu() {
  const { user } = useSignedInUser()
  useDocumentTitle('Secciones')
  return (
    <>
      <header className="mb-5">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em]">Secciones</h1>
      </header>

      <div className="space-y-5">
        {navigationGroups.map((group) => (
          <section key={group.title ?? 'home'} aria-label={group.title ?? 'Inicio'}>
            {group.title && (
              <h2 className="mb-2 px-1 text-[0.9rem] font-medium text-ink-3">{group.title}</h2>
            )}
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {group.destinations.map((destination) => {
                const Icon = destination.icon
                return (
                  <li key={destination.path}>
                    <Link
                      to={destination.path}
                      className="flex h-14 items-center gap-3.5 px-4 text-[1rem] font-medium transition-colors duration-150 hover:bg-surface-2"
                    >
                      <Icon size={20} className="text-ink-2" aria-hidden="true" />
                      <span className="flex-1">{destination.name}</span>
                      <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        <section aria-label="Tu usuario">
          <h2 className="mb-2 px-1 text-[0.9rem] font-medium text-ink-3">Tu usuario</h2>
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <p className="truncate border-b border-line px-4 py-3 text-[0.95rem] text-ink-2">
              <span className="sr-only">Sesión iniciada como </span>
              {user.email}
            </p>
            {profileDestinations.map((destination) => {
              const Icon = destination.icon
              return (
                <Link
                  key={destination.path}
                  to={destination.path}
                  className="flex h-14 items-center gap-3.5 border-b border-line px-4 text-[1rem] font-medium transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2"
                >
                  <Icon size={20} className="text-ink-2" aria-hidden="true" />
                  <span className="flex-1">{destination.name}</span>
                  <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
                </Link>
              )
            })}
            <SignOutButton
              iconSize={20}
              className="flex h-14 w-full items-center gap-3.5 px-4 text-left text-[1rem] font-medium transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2 disabled:opacity-70"
            />
          </div>
        </section>
      </div>
    </>
  )
}
