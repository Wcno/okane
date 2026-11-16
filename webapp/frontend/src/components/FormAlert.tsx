import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

/** A problem with the whole form, announced as soon as it appears. */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem] text-ink">
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-critical" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

/** Confirmation that something the User asked for is done, announced without interrupting. */
export function FormNotice({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-[0.95rem] text-ink">
      <CircleCheck size={18} className="mt-0.5 shrink-0 text-good" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
