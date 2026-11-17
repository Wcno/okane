import type { Account } from '../accounts/api'
import { balanceSentence } from '../accounts/presentation'
import { formatMoney } from '../lib/money'
import { changeVerbs, type RecordChange } from '../lib/recordChange'
import type { Income } from './api'

/** "Registraste un ingreso de $100.00. Saldo de ...", with the Balance the change left. */
export function savedIncomeNotice(
  change: RecordChange,
  income: Pick<Income, 'amount'>,
  account: Pick<Account, 'name' | 'balance'> | undefined,
): string {
  const sentence = `${changeVerbs[change]} un ingreso de ${formatMoney(income.amount)}.`
  const balance = balanceSentence(account)
  return balance ? `${sentence} ${balance}` : sentence
}
