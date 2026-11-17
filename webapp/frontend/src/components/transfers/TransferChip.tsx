import { ArrowLeftRight } from 'lucide-react'

/** The icon chip of a Transfer, in the size of a Category chip so the lists line up; a Transfer has no Category. */
export function TransferChip({ size = 40 }: { size?: 36 | 40 }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2"
    >
      <ArrowLeftRight size={size === 36 ? 18 : 19} aria-hidden="true" />
    </span>
  )
}
