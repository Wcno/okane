import type { Account, AccountType } from './api'
import { formatMoney } from '../lib/money'
import { ratioToPercent } from './form'

/** Order of the groups on the Accounts screen and of the options in the form. */
export const accountTypes: AccountType[] = ['spending', 'savings', 'investment']

export const accountTypeLabels: Record<AccountType, string> = {
  spending: 'Gastos',
  savings: 'Ahorro',
  investment: 'Inversión',
}

export const accountTypeDescriptions: Record<AccountType, string> = {
  spending: 'El dinero del día a día: cuenta corriente, efectivo o tarjeta de crédito.',
  savings: 'Dinero que apartas. Puede llevar una tasa de interés anual.',
  investment: 'El efectivo de tu bróker. Se fondea con Transferencias.',
}

export const accountsBack = { to: '/accounts', label: 'Cuentas' }

export const formatRate = (ratio: string) => `${ratioToPercent(ratio)}%`

export const findAccount = (accounts: Account[], id: string | undefined) =>
  accounts.find((account) => String(account.id) === id)

/** Accounts that can take an Income or an Expense: spending or savings, not archived. `keep` stays even if archived. */
export function offeredAccounts(accounts: Account[], keep?: number): Account[] {
  return accounts.filter(
    (account) => account.id === keep || (account.type !== 'investment' && account.archivedAt === null),
  )
}

/** "Saldo de Cuenta corriente: $987.50." The Balance is the consequence of the change. */
export function balanceSentence(account: Pick<Account, 'name' | 'balance'> | undefined): string {
  if (!account) return ''
  const negative = account.balance.startsWith('-') ? ' Quedó en negativo.' : ''
  return `Saldo de ${account.name}: ${formatMoney(account.balance)}.${negative}`
}
