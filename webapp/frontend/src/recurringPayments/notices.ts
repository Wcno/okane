import type { Account } from '../accounts/api'
import { balanceSentence } from '../expenses/notices'
import { formatMoney } from '../lib/money'

export type RuleChange = 'created' | 'updated' | 'deleted'

const ruleVerbs: Record<RuleChange, string> = {
  created: 'Creaste',
  updated: 'Guardaste',
  deleted: 'Eliminaste',
}

/** "Creaste el pago recurrente Alquiler de $500.00." */
export function ruleNotice(change: RuleChange, title: string, amount: string): string {
  const sentence = `${ruleVerbs[change]} el pago recurrente ${title} de ${formatMoney(amount)}.`
  return change === 'deleted' ? `${sentence} Las reservas que ya existen se conservan.` : sentence
}

/** "Confirmaste Alquiler: registraste un gasto de $120.00. Saldo de Cuenta: $880.00." */
export function confirmedNotice(
  title: string,
  amount: string,
  account: Pick<Account, 'name' | 'balance'> | undefined,
): string {
  const sentence = `Confirmaste ${title}: registraste un gasto de ${formatMoney(amount)}.`
  const balance = balanceSentence(account)
  return balance ? `${sentence} ${balance}` : sentence
}

/** "Cancelaste Alquiler. La reserva de $100.00 quedó libre y no se registró ningún gasto." */
export const cancelledNotice = (title: string, amount: string) =>
  `Cancelaste ${title}. La reserva de ${formatMoney(amount)} quedó libre y no se registró ningún gasto.`
