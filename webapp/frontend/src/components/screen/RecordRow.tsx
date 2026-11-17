import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatMoney } from '../../lib/money'

/**
 * One record of a list: the whole row is a link to the screen that edits it,
 * so a phone gives the name and the details all the width. Deleting is reached
 * from that screen. `action` says what the link opens; it is read after the
 * visible text, so the accessible name starts with what is on screen.
 * Every list of records (Gastos, Cuentas, Ingresos...) uses this row. Without `to` the
 * row is plain, for a record that cannot be opened; without `amount` it shows none.
 */
export function RecordRow({
  to,
  id,
  action,
  icon,
  title,
  details,
  amount,
}: {
  to?: string
  /** The DOM id of the link, so a screen can move the keyboard to a row. */
  id?: string
  /** What the link does, in Spanish, e.g. "Editar gasto". */
  action?: string
  icon: ReactNode
  title: string
  details?: string
  amount?: string
}) {
  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-[1rem] font-medium">{title}</span>
        {details && (
          <span className="mt-0.5 block break-words text-[0.87rem] leading-snug text-ink-3">{details}</span>
        )}
      </span>
      {amount !== undefined && (
        <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(amount)}</span>
      )}
      {to && action && <span className="sr-only">. {action}</span>}
    </>
  )
  const rowClassName = '-mx-2 flex min-h-[56px] items-center gap-3 rounded-xl px-2 py-3'
  if (!to) {
    return (
      <li id={id} className={rowClassName}>
        {content}
      </li>
    )
  }
  return (
    <li>
      <Link id={id} to={to} className={`${rowClassName} transition-colors duration-150 hover:bg-surface-2`}>
        {content}
      </Link>
    </li>
  )
}
