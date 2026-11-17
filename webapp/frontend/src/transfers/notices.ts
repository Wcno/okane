import type { Account } from '../accounts/api'
import { balanceSentence } from '../accounts/presentation'
import { formatMoney } from '../lib/money'
import { changeVerbs, type RecordChange } from '../lib/recordChange'
import type { Transfer } from './api'
import { isContribution } from './presentation'

type Side = Pick<Account, 'name' | 'balance' | 'type'>

/**
 * "Registraste una transferencia de $250.00 de A a B. Saldo de A: $750.00. Saldo de B: $550.00."
 * Into an investment Account it is an Aporte. Both Balances are the consequence of the change.
 */
export function savedTransferNotice(
  change: RecordChange,
  transfer: Pick<Transfer, 'amount'>,
  [source, destination]: Array<Side | undefined>,
): string {
  const kind = isContribution(destination) ? 'un aporte' : 'una transferencia'
  const route = source && destination ? ` de ${source.name} a ${destination.name}` : ''
  const sentence = `${changeVerbs[change]} ${kind} de ${formatMoney(transfer.amount)}${route}.`
  return [sentence, balanceSentence(source), balanceSentence(destination)].filter(Boolean).join(' ')
}
