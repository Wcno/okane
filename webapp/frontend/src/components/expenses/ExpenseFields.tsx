import type { ReactNode, Ref } from 'react'
import type { Account } from '../../accounts/api'
import type { ExpenseErrors } from '../../expenses/api'
import { DESCRIPTION_MAX_LENGTH, type ExpenseDraft } from '../../expenses/form'
import { todayInPanama } from '../../lib/dates'
import { AmountField, CategoryPicker, FieldError, borderClassName, fieldClassName } from './fieldParts'

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
        id={id}
        value={draft.amount}
        onChange={(amount) => onChange({ amount })}
        errors={errors.amount}
        inputRef={amountRef}
      />

      <CategoryPicker
        id={id}
        value={draft.categoryId}
        onChange={(categoryId) => onChange({ categoryId })}
        errors={errors.categoryId}
        hint={hint}
      />

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
        <div className="min-w-0">
          <label htmlFor={id('date')} className="text-[0.9rem] font-medium text-ink-2">
            Fecha
          </label>
          <input
            id={id('date')}
            type="date"
            value={draft.date}
            min={chosenAccount?.openingDate}
            max={todayInPanama()}
            onChange={(event) => onChange({ date: event.target.value })}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? id('date-error') : undefined}
            className={`${fieldClassName} ${borderClassName(Boolean(errors.date))} mt-1.5`}
          />
        </div>
      </div>
      {accountNote && (
        <p id={accountNoteId} className="-mt-1 text-[0.87rem] text-ink-3">
          {accountNote}
        </p>
      )}
      <FieldError id={id('account-error')} errors={errors.accountId} />
      <FieldError id={id('date-error')} errors={errors.date} />

      <div>
        <label htmlFor={id('description')} className="text-[0.9rem] font-medium text-ink-2">
          Descripción <span className="font-normal text-ink-3">(opcional)</span>
        </label>
        <input
          id={id('description')}
          value={draft.description}
          onChange={(event) => onChange({ description: event.target.value })}
          autoComplete="off"
          maxLength={DESCRIPTION_MAX_LENGTH}
          placeholder="Supermercado, taxi, farmacia"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? id('description-error') : undefined}
          className={`${fieldClassName} ${borderClassName(Boolean(errors.description))} mt-1.5 placeholder:text-ink-3`}
        />
        <FieldError id={id('description-error')} errors={errors.description} />
      </div>
    </>
  )
}
