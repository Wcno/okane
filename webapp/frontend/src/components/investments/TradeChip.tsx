import { Coins, TrendingDown, TrendingUp } from 'lucide-react'
import type { TradeKind } from '../../investments/api'

/** The tinted icon of a purchase, a sale or a Dividend; its word always sit beside it. */
export function TradeChip({ kind }: { kind: TradeKind }) {
  const Icon = { buy: TrendingUp, sell: TrendingDown, dividend: Coins }[kind]
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
      <Icon size={19} aria-hidden="true" />
    </span>
  )
}
