import type { Account } from '../accounts/api'
import { accountTypeLabels } from '../accounts/presentation'
import { formatDay } from '../lib/dates'
import type { Transfer } from './api'

export const transfersBack = { to: '/transfers', label: 'Transferencias' }

/** Accounts that can take a Transfer: any type, not archived. `keep` stay even if archived. */
export function offeredAccounts(accounts: Account[], keep: number[] = []): Account[] {
  return accounts.filter((account) => keep.includes(account.id) || account.archivedAt === null)
}

/** "Cuenta corriente · Gastos": the name, and the type that tells a Contribution apart. */
export const accountOptionLabel = (account: Account) =>
  `${account.name} · ${accountTypeLabels[account.type]}${account.archivedAt === null ? '' : ' (archivada)'}`

/** A Transfer into an investment Account is a Contribution (GLOSSARY.md, Aporte). */
export const isContribution = (destination: Pick<Account, 'type'> | undefined) => destination?.type === 'investment'

/** "Cuenta corriente → Ahorro", with the same text read aloud as "de … a …" by the row's label. */
export const routeText = (sourceName: string, destinationName: string) => `${sourceName} → ${destinationName}`

/** What a Transfer is called and what is known about it: the description, else its route. */
export function describeTransfer(
  transfer: Transfer,
  accounts: Map<number, Account>,
  options: { withDate?: boolean } = {},
): { title: string; details: string; label: string } {
  const source = accounts.get(transfer.sourceAccountId)
  const destination = accounts.get(transfer.destinationAccountId)
  const route = routeText(source?.name ?? 'Cuenta', destination?.name ?? 'Cuenta')
  const contribution = isContribution(destination)
  const details = [
    contribution && 'Aporte',
    transfer.description && route,
    options.withDate && formatDay(transfer.date),
  ]
  return {
    title: transfer.description || route,
    details: details.filter(Boolean).join(' · '),
    label: `de ${source?.name ?? 'una Cuenta'} a ${destination?.name ?? 'otra Cuenta'}`,
  }
}

/** Why the screens that register a Transfer ask for a second Account first. */
export const NEEDS_TWO_ACCOUNTS =
  'Una transferencia mueve dinero entre dos de tus Cuentas. Crea la que te falta y vuelve aquí.'
