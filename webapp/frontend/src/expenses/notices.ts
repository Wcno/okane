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

/** "Registraste un gasto de $12.50 en Alimentación. Saldo de ...". `verb` is in the past, second person. */
export function savedNotice(
  verb: string,
  expense: Pick<Expense, 'amount' | 'categoryId'>,
  account: Pick<Account, 'name' | 'balance'> | undefined,
): string {
  const sentence = `${verb} un gasto de ${formatMoney(expense.amount)} en ${categoryById(expense.categoryId).name}.`
  const balance = balanceSentence(account)
  return balance ? `${sentence} ${balance}` : sentence
}
