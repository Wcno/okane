import { ArrowDownToLine } from 'lucide-react'

/** The icon chip of an Income (DESIGN.md, Ficha de Categoría); the name always sits beside it. */
export function IncomeChip() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--good)_15%,transparent)] text-good">
      <ArrowDownToLine size={19} aria-hidden="true" />
    </span>
  )
}
