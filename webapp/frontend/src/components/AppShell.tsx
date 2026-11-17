import { Ellipsis, Plus, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSignedInUser } from '../auth/context'
import { bottomBarDestinations, navigationGroups, profileDestinations, type Destination } from '../navigation'
import { useData } from '../state/context'
import { ExpenseForm } from './ExpenseForm'
import { Logo } from './Logo'
import { SignOutButton } from './SignOutButton'

/** Whether the route on screen is the destination, below it or another route of the same screen. */
const isCurrent = (destination: Destination, pathname: string) =>
  [destination.path, ...(destination.alsoActiveOn ?? [])].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )

function SidebarLink({ destination }: { destination: Destination }) {
  const Icon = destination.icon
  const current = isCurrent(destination, useLocation().pathname)
  return (
    <Link
      to={destination.path}
      aria-current={current ? 'page' : undefined}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[0.95rem] transition-colors duration-150 ${
        current
          ? 'bg-surface font-semibold text-ink shadow-card'
          : 'font-medium text-ink-2 hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink'
      }`}
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      {destination.name}
    </Link>
  )
}

function ProfileLink({ destination }: { destination: Destination }) {
  const Icon = destination.icon
  return (
    <NavLink
      to={destination.path}
      className={({ isActive }) =>
        `flex h-10 w-full items-center gap-3 rounded-xl px-2 text-[0.95rem] transition-colors duration-150 ${
          isActive
            ? 'bg-surface font-semibold text-ink shadow-card'
            : 'font-medium text-ink-2 hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink'
        }`
      }
    >
      <Icon size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {destination.name}
    </NavLink>
  )
}

function Sidebar() {
  const { user } = useSignedInUser()
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-4 pb-5 pt-7 lg:flex">
      <div className="px-2">
        <Logo />
      </div>
      <nav aria-label="Secciones" className="mt-8 flex-1 space-y-6 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.title ?? 'home'}>
            {group.title && (
              <h2 className="mb-1.5 px-3 text-[0.8rem] font-medium text-ink-3">{group.title}</h2>
            )}
            <ul className="space-y-0.5">
              {group.destinations.map((destination) => (
                <li key={destination.path}>
                  <SidebarLink destination={destination} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-3 border-t border-line px-1 pt-4">
        <p className="truncate px-2 text-[0.87rem] text-ink-2" title={user.email}>
          <span className="sr-only">Sesión iniciada como </span>
          {user.email}
        </p>
        {profileDestinations.map((destination) => (
          <ProfileLink key={destination.path} destination={destination} />
        ))}
        <SignOutButton
          iconSize={18}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-2 text-left text-[0.95rem] font-medium text-ink-2 transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--ink)_6%,transparent)] hover:text-ink disabled:opacity-70"
        />
      </div>
    </aside>
  )
}

function BottomBarLink({ destination }: { destination: Destination }) {
  const Icon = destination.icon
  return (
    <NavLink
      to={destination.path}
      className={({ isActive }) =>
        `flex h-full flex-col items-center justify-center gap-1 text-[0.72rem] ${
          isActive ? 'font-semibold text-ink' : 'font-medium text-ink-3'
        }`
      }
    >
      <Icon size={21} strokeWidth={2} aria-hidden="true" />
      {destination.name}
    </NavLink>
  )
}

function BottomBar() {
  const { openForm } = useData()
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5 items-stretch">
        {bottomBarDestinations.left.map((destination) => (
          <BottomBarLink key={destination.path} destination={destination} />
        ))}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={openForm}
            aria-label="Registrar gasto"
            className="grid size-13 -translate-y-3 place-items-center rounded-full bg-primary text-on-primary shadow-float transition-transform duration-150 active:scale-95"
          >
            <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        {bottomBarDestinations.right.map((destination) => (
          <BottomBarLink key={destination.path} destination={destination} />
        ))}
        <BottomBarLink destination={{ path: '/menu', name: 'Más', icon: Ellipsis }} />
      </div>
    </nav>
  )
}

function Notice() {
  const { notice, dismissNotice } = useData()

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(dismissNotice, 7000)
    return () => window.clearTimeout(timer)
  }, [notice, dismissNotice])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-30 flex justify-center lg:inset-x-auto lg:bottom-8 lg:right-8"
    >
      {notice && (
        <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl bg-primary py-3 pl-4 pr-2 text-[0.95rem] text-on-primary shadow-float">
          <p className="py-0.5">{notice}</p>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Cerrar aviso"
            className="grid size-7 shrink-0 place-items-center rounded-full opacity-70 hover:opacity-100 focus-visible:outline-on-primary"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const { openForm } = useData()
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar />
      <div className="relative min-w-0">
        <header className="flex h-14 items-center px-4 sm:px-6 lg:hidden">
          <Logo />
        </header>
        <div className="absolute right-10 top-9 hidden lg:block">
          <button
            type="button"
            onClick={openForm}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary pl-3.5 pr-4.5 text-[0.95rem] font-semibold text-on-primary transition-transform duration-150 hover:-translate-y-px active:translate-y-0"
          >
            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            Registrar gasto
          </button>
        </div>
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-2 sm:px-6 lg:px-10 lg:pb-14 lg:pt-9">
          <Outlet />
        </main>
      </div>
      <BottomBar />
      <ExpenseForm />
      <Notice />
    </div>
  )
}
