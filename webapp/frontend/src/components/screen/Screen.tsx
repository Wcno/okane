import { ArrowLeft, CircleCheck, Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Loaded } from '../../lib/useLoaded'
import { smallSecondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'

export const cardClassName = 'rounded-card border border-line bg-surface p-5 shadow-card lg:p-6'

/** Title of a screen of a record section (Gastos, Ingresos...), with the way back to its list. */
const primaryActionClassName =
  'inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-[1rem] font-semibold text-on-primary transition-transform duration-150 hover:-translate-y-px active:scale-[0.98]'

export function ScreenHeader({
  title,
  intro,
  back,
  action,
}: {
  title: string
  intro?: ReactNode
  back?: { to: string; label: string }
  action?: { to: string; label: string; shortLabel?: string }
}) {
  return (
    <header className="mb-5 lg:mb-7 lg:pr-48">
      {back && (
        <Link
          to={back.to}
          className="-mt-2 mb-0.5 inline-flex min-h-[44px] items-center gap-1.5 rounded-md text-[0.9rem] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">{title}</h1>
          {intro && <p className="mt-1 max-w-[60ch] text-ink-2">{intro}</p>}
        </div>
        {action && (
          <Link to={action.to} aria-label={action.label} className={primaryActionClassName}>
            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
            <span className="sm:hidden">{action.shortLabel ?? action.label}</span>
            <span className="hidden sm:inline">{action.label}</span>
          </Link>
        )}
      </div>
    </header>
  )
}

/** What a screen shows while its data is not here: loading, or a failure that can be retried. */
export function Pending({
  state,
  retry,
  loading,
}: {
  state: Exclude<Loaded<unknown>, { status: 'ready' }>
  retry: () => void
  loading: string
}) {
  if (state.status === 'loading') {
    return (
      <p role="status" className="text-ink-3">
        {loading}
      </p>
    )
  }
  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <FormAlert>{state.message}</FormAlert>
      <button type="button" onClick={retry} className={`${smallSecondaryButtonClassName} mt-4`}>
        Reintentar
      </button>
    </section>
  )
}

/** A record that is not the User's, or no longer exists, looks the same either way. */
export function NotHere({ title, text, back }: { title: string; text: string; back: { to: string; label: string } }) {
  return (
    <>
      <ScreenHeader title={title} back={back} />
      <section className={`${cardClassName} max-w-[34rem]`}>
        <p className="text-ink-2">{text}</p>
        <Link to={back.to} className={`${smallSecondaryButtonClassName} mt-5`}>
          <ArrowLeft size={17} aria-hidden="true" />
          Volver a {back.label}
        </Link>
      </section>
    </>
  )
}

/** The confirmation of the last change, announced without interrupting; the live region is always there. */
export function NoticeBanner({ notice, className = '' }: { notice: string | null; className?: string }) {
  return (
    <div role="status" aria-live="polite">
      {notice && (
        <p className={`mb-4 flex items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem] lg:mb-5 ${className}`}>
          <CircleCheck size={18} className="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
          {notice}
        </p>
      )}
    </div>
  )
}

/** What a list shows before it has a first record; the same width on every list. */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text: string
  action: { to: string; label: string }
}) {
  return (
    <section className={`${cardClassName} max-w-[44rem] lg:p-8`}>
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-[1.2rem] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-2 max-w-[60ch] text-ink-2">{text}</p>
      <Link
        to={action.to}
        className={`mt-6 ${primaryActionClassName}`}
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        {action.label}
      </Link>
    </section>
  )
}
