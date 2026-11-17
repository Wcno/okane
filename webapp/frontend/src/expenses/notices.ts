import type { Account } from '../accounts/api'
import { balanceSentence } from '../accounts/presentation'
import { categoryById } from '../data/categories'
import { formatMoney } from '../lib/money'
import type { Expense } from './api'

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
