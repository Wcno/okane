import type { Account } from '../../accounts/api'
import type { IncomeErrors } from '../../incomes/api'
import type { IncomeDraft } from '../../incomes/form'
import { AccountAndDateFields, AmountField, DescriptionField } from '../record/RecordFields'

/** The fields of an Income: amount, Account, date and description. It has no Category. */
export function IncomeFields({
  idPrefix,
  draft,
  onChange,
  errors,
  accounts,
  accountNote,
}: {
  idPrefix: string
  draft: IncomeDraft
  onChange: (patch: Partial<IncomeDraft>) => void
  errors: IncomeErrors
  /** The Accounts the Income may name. */
  accounts: Account[]
  /** Explains the Account when the Income already lives on an archived one. */
  accountNote?: string
}) {
  const shared = { idPrefix, draft, onChange, errors }
  return (
    <>
      <AmountField {...shared} />
      <AccountAndDateFields {...shared} accounts={accounts} accountNote={accountNote} />
      <DescriptionField {...shared} placeholder="Salario, intereses, venta" />
    </>
  )
}
