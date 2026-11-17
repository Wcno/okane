import type { ReactNode, Ref } from 'react'
import type { Account } from '../../accounts/api'
import { categories } from '../../data/categories'
import type { ExpenseErrors } from '../../expenses/api'
import type { ExpenseDraft } from '../../expenses/form'
import { AccountAndDateFields, AmountField, DescriptionField, FieldError } from '../record/RecordFields'
import { CategoryChip } from './CategoryChip'

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
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <>
      <AmountField idPrefix={idPrefix} draft={draft} onChange={onChange} errors={errors} amountRef={amountRef} />

      <fieldset aria-describedby={errors.categoryId ? id('category-error') : undefined}>
        <legend className="text-[0.9rem] font-medium text-ink-2">Categoría</legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {categories.map((option) => {
            const selected = draft.categoryId === option.id
            return (
              <label
                key={option.id}
                className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl border p-1.5 pr-2 transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${
                  selected ? 'border-ink bg-surface-2' : 'border-line hover:bg-surface-2'
                }`}
              >
                <input
                  type="radio"
                  name={id('category')}
                  value={option.id}
                  checked={selected}
                  onChange={() => onChange({ categoryId: option.id })}
                  aria-invalid={Boolean(errors.categoryId)}
                  className="sr-only"
                />
                <CategoryChip categoryId={option.id} size={36} />
                <span
                  className={`min-w-0 hyphens-auto break-words text-[0.9rem] leading-tight ${selected ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}
                >
                  {option.name}
                </span>
              </label>
            )
          })}
        </div>
        <FieldError id={id('category-error')} errors={errors.categoryId} />
        {/* Always in the page, so a screen reader hears the hint when it appears; empty, it takes no room. */}
        <div aria-live="polite">{hint}</div>
      </fieldset>

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
