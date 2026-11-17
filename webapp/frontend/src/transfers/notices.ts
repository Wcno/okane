import type { Account } from '../accounts/api'
import { balanceSentence } from '../expenses/notices'
import { formatMoney } from '../lib/money'
import type { Transfer } from './api'
import { isContribution } from './presentation'

/** What happened to a Transfer; the notice says it in Spanish. */
export type TransferChange = 'created' | 'updated' | 'deleted'

const changeVerbs: Record<TransferChange, string> = {
  created: 'Registraste',
  updated: 'Guardaste',
  deleted: 'Eliminaste',
}

type Side = Pick<Account, 'name' | 'balance' | 'type'>

/**
 * "Registraste una transferencia de $250.00 de A a B. Saldo de A: $750.00. Saldo de B: $550.00."
 * Into an investment Account it is an Aporte. Both Balances are the consequence of the change.
 */
export function savedNotice(
  change: TransferChange,
  transfer: Pick<Transfer, 'amount'>,
  source: Side | undefined,
  destination: Side | undefined,
): string {
  const kind = isContribution(destination) ? 'un aporte' : 'una transferencia'
  const route = source && destination ? ` de ${source.name} a ${destination.name}` : ''
  const sentence = `${changeVerbs[change]} ${kind} de ${formatMoney(transfer.amount)}${route}.`
  return [sentence, balanceSentence(source), balanceSentence(destination)].filter(Boolean).join(' ')
}
