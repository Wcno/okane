import type { Account } from '../accounts/api'
import { balanceSentence } from '../accounts/presentation'
import { categoryById } from '../data/categories'
import { formatMoney } from '../lib/money'
import { changeVerbs, type RecordChange } from '../lib/recordChange'
import type { Expense } from './api'

/** "Registraste un gasto de $12.50 en Alimentación. Saldo de ..." */
export function savedNotice(
  change: RecordChange,
  expense: Pick<Expense, 'amount' | 'categoryId'>,
  account: Pick<Account, 'name' | 'balance'> | undefined,
): string {
  const sentence = `${changeVerbs[change]} un gasto de ${formatMoney(expense.amount)} en ${categoryById(expense.categoryId).name}.`
  const balance = balanceSentence(account)
  return balance ? `${sentence} ${balance}` : sentence
}
