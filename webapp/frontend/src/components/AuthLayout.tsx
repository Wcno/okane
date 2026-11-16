import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './AppShell'

/** Frame of the screens a visitor sees without a session: logo and one card. */
export function AuthLayout({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mx-auto w-full max-w-[28rem]">
        <Logo />
      </header>
      <main className="mx-auto mt-8 w-full max-w-[28rem] sm:mt-14">
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">{title}</h1>
        {intro && <p className="mt-2 text-ink-2">{intro}</p>}
        <section className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card lg:p-6">{children}</section>
      </main>
    </div>
  )
}

/** Link between login and registration that keeps the screen the visitor asked for. */
export function AuthSwitch({
  question,
  to,
  state,
  children,
}: {
  question: string
  to: string
  state: unknown
  children: ReactNode
}) {
  return (
    <p className="mt-5 text-[0.95rem] text-ink-2">
      {question}{' '}
      <Link to={to} state={state} className="font-semibold text-ink underline decoration-line-strong hover:decoration-ink">
        {children}
      </Link>
    </p>
  )
}
