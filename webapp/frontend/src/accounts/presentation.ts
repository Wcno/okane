import type { Account, AccountType } from './api'
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
