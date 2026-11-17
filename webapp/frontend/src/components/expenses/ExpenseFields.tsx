import type { ReactNode, Ref } from 'react'
import type { Account } from '../../accounts/api'
import { categories } from '../../data/categories'
import type { ExpenseErrors } from '../../expenses/api'
import { DESCRIPTION_MAX_LENGTH, type ExpenseDraft } from '../../expenses/form'
import { AmountField, DateField, DescriptionField, FieldError } from '../screen/fields'
import { borderClassName, fieldClassName } from '../screen/fieldStyles'
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
  const chosenAccount = accounts.find((account) => account.id === draft.accountId)
  const accountNoteId = accountNote ? id('account-note') : undefined
  const accountDescribedBy = [errors.accountId ? id('account-error') : undefined, accountNoteId].filter(Boolean).join(' ')

  return (
    <>
      <AmountField
        id={id('amount')}
        value={draft.amount}
        onChange={(amount) => onChange({ amount })}
        errors={errors.amount}
        inputRef={amountRef}
      />

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
                  className={`min-w-0 break-words text-[0.9rem] leading-tight ${selected ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}
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

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 min-[420px]:gap-3">
        <div className="min-w-0">
          <label htmlFor={id('account')} className="text-[0.9rem] font-medium text-ink-2">
            Cuenta
          </label>
          <select
            id={id('account')}
            value={draft.accountId ?? ''}
            onChange={(event) => onChange({ accountId: Number(event.target.value) })}
            aria-invalid={Boolean(errors.accountId)}
            aria-describedby={accountDescribedBy || undefined}
            className={`${fieldClassName} ${borderClassName(Boolean(errors.accountId))} mt-1.5`}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {account.archivedAt !== null && ' (archivada)'}
              </option>
            ))}
          </select>
        </div>
        <DateField
          id={id('date')}
          value={draft.date}
          min={chosenAccount?.openingDate}
          onChange={(date) => onChange({ date })}
          errors={errors.date}
        />
      </div>
      {accountNote && (
        <p id={accountNoteId} className="-mt-1 text-[0.87rem] text-ink-3">
          {accountNote}
        </p>
      )}
      <FieldError id={id('account-error')} errors={errors.accountId} />
      <FieldError id={id('date-error')} errors={errors.date} />

      <DescriptionField
        id={id('description')}
        value={draft.description}
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder="Supermercado, taxi, farmacia"
        onChange={(description) => onChange({ description })}
        errors={errors.description}
      />
    </>
  )
}
