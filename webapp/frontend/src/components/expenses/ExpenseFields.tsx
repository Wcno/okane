import type { ReactNode, Ref } from 'react'
import type { Account } from '../../accounts/api'
import type { ExpenseErrors } from '../../expenses/api'
import type { ExpenseDraft } from '../../expenses/form'
import { AccountAndDateFields, AmountField, DescriptionField } from '../record/RecordFields'
import { CategoryField } from './CategoryField'

/**
 * The fields of an Expense, shared by the quick sheet and the full screens:
 * amount, Category, Account, date and description. `hint` sits right under
 * the Categories, where the consequence of the Expense is shown.
 */
export function ExpenseFields({
  idPrefix,
  draft,
  onChange,
  errors,
  accounts,
  amountRef,
  hint,
  accountNote,
}: {
  idPrefix: string
  draft: ExpenseDraft
  onChange: (patch: Partial<ExpenseDraft>) => void
  errors: ExpenseErrors
  /** The Accounts the Expense may name. */
  accounts: Account[]
  amountRef?: Ref<HTMLInputElement>
  hint?: ReactNode
  /** Explains the Account when the Expense already lives on an archived one. */
  accountNote?: string
}) {
  return (
    <>
      <AmountField idPrefix={idPrefix} draft={draft} onChange={onChange} errors={errors} amountRef={amountRef} />

      <CategoryField idPrefix={idPrefix} draft={draft} onChange={onChange} errors={errors} hint={hint} />

      <AccountAndDateFields
        idPrefix={idPrefix}
        draft={draft}
        onChange={onChange}
        errors={errors}
        accounts={accounts}
        accountNote={accountNote}
      />

      <DescriptionField
        idPrefix={idPrefix}
        draft={draft}
        onChange={onChange}
        errors={errors}
        placeholder="Supermercado, taxi, farmacia"
      />
    </>
  )
}
