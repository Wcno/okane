import { TrendingDown, TrendingUp } from 'lucide-react'
import type { TradeKind } from '../../investments/api'

/** The tinted icon of a purchase or a sale; the words "Compra" or "Venta" always sit beside it. */
export function TradeChip({ kind }: { kind: TradeKind }) {
  const Icon = kind === 'buy' ? TrendingUp : TrendingDown
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
      <Icon size={19} aria-hidden="true" />
    </span>
  )
}
