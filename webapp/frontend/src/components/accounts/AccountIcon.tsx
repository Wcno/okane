import { ChartLine, CreditCard, PiggyBank, Wallet } from 'lucide-react'
import type { Account } from '../../accounts/api'

/** Neutral icon chip of an Account (DESIGN.md: color belongs to data, not to Accounts). */
export function AccountIcon({ account }: { account: Pick<Account, 'type' | 'balance'> }) {
  const Icon =
    account.type === 'savings'
      ? PiggyBank
      : account.type === 'investment'
        ? ChartLine
        : // A credit card is a spending Account with a negative Balance.
          account.balance.startsWith('-')
          ? CreditCard
          : Wallet
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
      <Icon size={19} aria-hidden="true" />
    </span>
  )
}
