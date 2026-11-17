import { Minus, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { smallSecondaryButtonClassName } from '../buttons'
import type { Return } from '../../investments/portfolio'
import { formatPercent, trendOf } from '../../investments/presentation'
import { formatMoney, moneyParts } from '../../lib/money'

/** Title of an investments screen with its create action at the top right, 44px tall on a phone. */
export function InvestmentHeader({
  title,
  intro,
  back,
  action,
}: {
  title: string
  intro: ReactNode
  back?: ReactNode
  action?: { to: string; label: string }
}) {
  return (
    <header className="mb-5 lg:mb-7 lg:pr-48">
      {back}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.025em] lg:text-[1.95rem]">{title}</h1>
          <p className="mt-1 max-w-[60ch] text-ink-2">{intro}</p>
        </div>
        {action && (
          <Link to={action.to} className={`${smallSecondaryButtonClassName} shrink-0`}>
            <Plus size={17} aria-hidden="true" />
            {action.label}
          </Link>
        )}
      </div>
    </header>
  )
}

/** The dominant figure of a screen: $ in tertiary ink, cents in secondary. Read whole by a screen reader. */
export function HeroMoney({ amount }: { amount: string }) {
  const { sign, integer, cents } = moneyParts(amount)
  return (
    <p className="mt-2 text-[3.2rem] font-semibold leading-none tracking-[-0.035em] lg:text-[4.25rem]">
      <span className="sr-only">{formatMoney(amount)}</span>
      <span aria-hidden="true">
        {sign}
        <span className="mr-0.5 text-[0.62em] font-medium text-ink-3">$</span>
        {integer}
        <span className="text-[0.5em] font-medium tracking-[-0.01em] text-ink-2">.{cents}</span>
      </span>
    </p>
  )
}

const trendStyle = {
  gain: { icon: TrendingUp, color: 'text-good', word: 'Ganancia' },
  loss: { icon: TrendingDown, color: 'text-critical', word: 'Pérdida' },
  flat: { icon: Minus, color: 'text-ink-2', word: 'Sin cambio' },
} as const

/** A Return in money and percent; its tone comes with an icon and a word, never alone. */
export function ReturnLine({ value, suffix }: { value: Return; suffix?: string }) {
  const trend = trendStyle[trendOf(value.amount)]
  const Icon = trend.icon
  return (
    <p className={`inline-flex flex-wrap items-center gap-x-1.5 text-[0.95rem] font-semibold ${trend.color}`}>
      <Icon size={17} aria-hidden="true" />
      <span className="sr-only">{trend.word}: </span>
      <span className="tabular-nums">{formatMoney(value.amount, { sign: true })}</span>
      <span className="tabular-nums">({formatPercent(value.percent)})</span>
      {suffix && <span className="font-medium text-ink-2">{suffix}</span>}
    </p>
  )
}

/** One labelled figure on the sunken surface inside a card. */
export function Figure({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <dt className="text-[0.9rem] text-ink-2">{label}</dt>
      <dd className="mt-0.5 text-[1.15rem] font-semibold tabular-nums">{children}</dd>
      {hint && <dd className="mt-0.5 text-[0.82rem] leading-snug text-ink-3">{hint}</dd>}
    </div>
  )
}
