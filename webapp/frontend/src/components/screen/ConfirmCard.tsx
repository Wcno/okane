import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Outcome } from '../../lib/http'
import { useSubmission } from '../../lib/useSubmission'
import { formatMoney } from '../../lib/money'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { FormAlert } from '../FormAlert'
import { cardClassName } from './Screen'

/** The record a confirmation is about, in the sunken block that opens the card. */
export function RecordSummary({
  icon,
  title,
  details,
  amount,
}: {
  icon: ReactNode
  title: string
  details: string
  amount: string
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-surface-2 p-3.5">
      {icon}
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 break-words text-[1rem] font-medium">{title}</h2>
        <p className="mt-0.5 break-words text-[0.87rem] text-ink-3">{details}</p>
      </div>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(amount)}</span>
    </div>
  )
}

/**
 * The card of a screen that asks before it deletes or archives a record: what
 * it is about, what will happen, and the button that does it. A failure shows
 * in the card and the button can be pressed again. Without `confirm` there is
 * nothing left to do and the card only offers the way back.
 */
export function ConfirmCard<Value, Field extends string>({
  summary,
  message,
  cancel,
  confirm,
}: {
  summary: ReactNode
  message: ReactNode
  cancel: { to: string; label: string }
  confirm?: {
    label: string
    busyLabel: string
    run: () => Promise<Outcome<Value, Field>>
    onSaved: (value: Value) => void | Promise<void>
    /** What to say when the write fails without a message of its own. */
    failure: string
  }
}) {
  const { isSubmitting, submit } = useSubmission()
  const [problem, setProblem] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!confirm) return
    setProblem(null)
    const outcome = await submit(confirm.run, confirm.onSaved)
    if (outcome && !outcome.ok) setProblem(outcome.errors.form?.join(' ') ?? confirm.failure)
  }

  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      {summary}
      <p className="mt-4 text-ink-2">{message}</p>

      {problem && (
        <div className="mt-4">
          <FormAlert>{problem}</FormAlert>
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
        <Link to={cancel.to} className={`${secondaryButtonClassName} sm:flex-1`}>
          {cancel.label}
        </Link>
        {confirm && (
          <button type="button" onClick={handleConfirm} disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? confirm.busyLabel : confirm.label}
          </button>
        )}
      </div>
    </section>
  )
}
