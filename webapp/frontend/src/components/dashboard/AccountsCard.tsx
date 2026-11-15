import { ChartLine, CreditCard, PiggyBank, Wallet } from 'lucide-react'
import { positionsValue, type Account, type AccountType } from '../../data/sample'
import { formatMoney } from '../../lib/money'
import { useAnimatedNumber } from '../../lib/useAnimatedNumber'
import { useData } from '../../state/context'
import { Card } from './Card'

const accountTypeLabels: Record<AccountType, string> = {
  spending: 'Gastos',
  savings: 'Ahorro',
  investment: 'Inversión',
}

function AccountIcon({ account }: { account: Account }) {
  if (account.type === 'savings') return <PiggyBank size={19} aria-hidden="true" />
  if (account.type === 'investment') return <ChartLine size={19} aria-hidden="true" />
  // A credit card is a spending Account with a negative balance.
  return account.balance < 0
    ? <CreditCard size={19} aria-hidden="true" />
    : <Wallet size={19} aria-hidden="true" />
}

function Row({ account }: { account: Account }) {
  const isInvestment = account.type === 'investment'
  // An investment Account displays cash plus the value of its Positions.
  const value = isInvestment ? account.balance + positionsValue : account.balance
  const displayed = useAnimatedNumber(value)

  return (
    <li className="flex items-center gap-3.5 py-3 first:pt-1 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <AccountIcon account={account} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[1rem] font-medium">{account.name}</h3>
        <p className="mt-0.5 text-[0.87rem] leading-snug tabular-nums text-ink-3">
          {isInvestment
            ? `Efectivo ${formatMoney(account.balance)} · Posiciones ${formatMoney(positionsValue)}`
            : accountTypeLabels[account.type]}
        </p>
      </div>
      <span className="shrink-0 text-[1rem] font-semibold tabular-nums">{formatMoney(displayed)}</span>
    </li>
  )
}

/** Accounts and their balances contribute to Net Worth. */
export function AccountsCard() {
  const { state } = useData()
  return (
    <Card id="accounts" title="Cuentas" link={{ to: '/accounts', text: 'Ver todas' }}>
      <ul className="mt-3 divide-y divide-line">
        {state.accounts.map((account) => (
          <Row key={account.id} account={account} />
        ))}
      </ul>
    </Card>
  )
}
