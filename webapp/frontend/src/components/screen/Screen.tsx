import { ArrowLeft, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Loaded } from '../../lib/useLoaded'
import { smallSecondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'

export const cardClassName = 'rounded-card border border-line bg-surface p-5 shadow-card lg:p-6'

/** Title of a screen of a record section (Gastos, Ingresos...), with the way back to its list. */
export function ScreenHeader({
  title,
  intro,
  back,
}: {
  title: string
  intro?: ReactNode
  back?: { to: string; label: string }
}) {
  return (
    <header className="mb-5 lg:mb-7 lg:pr-48">
      {back && (
        <Link
          to={back.to}
          className="mb-2 inline-flex items-center gap-1.5 rounded-md text-[0.9rem] font-medium text-ink-2 transition-colors duration-150 hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">{title}</h1>
      {intro && <p className="mt-1 max-w-[60ch] text-ink-2">{intro}</p>}
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
