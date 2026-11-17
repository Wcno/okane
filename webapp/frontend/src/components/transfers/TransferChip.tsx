import { ArrowLeftRight } from 'lucide-react'

/** The icon tile of a Transfer: neutral, because a Transfer is not an Income nor an Expense and carries no Category. */
export function TransferChip() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
      <ArrowLeftRight size={19} aria-hidden="true" />
    </span>
  )
}
