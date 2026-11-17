import type { ReactNode, Ref } from 'react'
import type { Account } from '../../accounts/api'
import { categories } from '../../data/categories'
import type { ExpenseErrors } from '../../expenses/api'
import { DESCRIPTION_MAX_LENGTH, type ExpenseDraft } from '../../expenses/form'
import { todayInPanama } from '../../lib/dates'
import { CategoryChip } from './CategoryChip'

const fieldClassName =
  'h-11 w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

const borderClassName = (invalid: boolean) =>
  invalid ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) return null
  return (
    <p id={id} className="mt-1.5 text-[0.9rem] text-critical">
      {errors.join(' ')}
    </p>
  )
}

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
      <div>
        <label htmlFor={id('amount')} className="text-[0.9rem] font-medium text-ink-2">
          Monto
        </label>
        <div
          className={`mt-1.5 flex items-baseline gap-1 rounded-2xl border bg-surface px-4 py-2.5 transition-colors duration-150 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/15 ${
            errors.amount ? 'border-critical' : 'border-line-strong hover:border-ink-3'
          }`}
        >
          <span className="text-[1.6rem] font-semibold text-ink-3" aria-hidden="true">
            $
          </span>
          <input
            ref={amountRef}
            id={id('amount')}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={draft.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? id('amount-error') : undefined}
            className="w-full min-w-0 bg-transparent text-[2rem] font-semibold tracking-[-0.02em] placeholder:text-ink-3/60 focus-visible:outline-none"
          />
        </div>
        <FieldError id={id('amount-error')} errors={errors.amount} />
      </div>

      <fieldset aria-describedby={errors.categoryId ? id('category-error') : undefined}>
        <legend className="text-[0.9rem] font-medium text-ink-2">Categoría</legend>
        {/* As many columns as keep the longest name whole (Entretenimiento needs about 165px); a narrow screen gets one. */}
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-1.5">
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
