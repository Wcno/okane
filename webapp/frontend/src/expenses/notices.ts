import type { Account } from '../accounts/api'
import { categoryById } from '../data/categories'
import { formatMoney } from '../lib/money'
import type { Expense } from './api'

/** "Saldo de Cuenta corriente: $987.50." The Balance is the consequence of the change. */
export function balanceSentence(account: Pick<Account, 'name' | 'balance'> | undefined): string {
  if (!account) return ''
  const negative = account.balance.startsWith('-') ? ' Quedó en negativo.' : ''
  return `Saldo de ${account.name}: ${formatMoney(account.balance)}.${negative}`
}

/** What happened to an Expense; the notice says it in Spanish. */
export type ExpenseChange = 'created' | 'updated' | 'deleted'

const changeVerbs: Record<ExpenseChange, string> = {
  created: 'Registraste',
  updated: 'Guardaste',
  deleted: 'Eliminaste',
}

/** "Registraste un gasto de $12.50 en Alimentación. Saldo de ..." */
export function savedNotice(
  change: ExpenseChange,
  expense: Pick<Expense, 'amount' | 'categoryId'>,
  account: Pick<Account, 'name' | 'balance'> | undefined,
): string {
  const sentence = `${changeVerbs[change]} un gasto de ${formatMoney(expense.amount)} en ${categoryById(expense.categoryId).name}.`
  const balance = balanceSentence(account)
  return balance ? `${sentence} ${balance}` : sentence
}
