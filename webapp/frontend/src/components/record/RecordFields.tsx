import type { Ref } from 'react'
import type { Account } from '../../accounts/api'
import { todayInPanama } from '../../lib/dates'
import type { FieldErrors } from '../../lib/http'
import { DESCRIPTION_MAX_LENGTH, type RecordDraft, type RecordField } from '../../lib/recordForm'

export const fieldClassName =
  'h-[44px] w-full rounded-xl border bg-surface px-3.5 text-[1rem] text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15'

export const borderClassName = (invalid: boolean) =>
  invalid ? 'border-critical' : 'border-line-strong hover:border-ink-3 focus-visible:border-ink'

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors) return null
  return (
    <p id={id} className="mt-1.5 text-[0.9rem] text-critical">
      {errors.join(' ')}
    </p>
  )
}

/** What every field of a record of money takes: where its ids start, the draft, how to change it, what is wrong. */
export interface RecordFieldProps {
  idPrefix: string
  draft: RecordDraft
  onChange: (patch: Partial<RecordDraft>) => void
  errors: FieldErrors<RecordField>
}

/** The part of a form a single field needs: the Expense, the Income and the Transfer all fit it. */
interface FieldPart<Key extends RecordField> {
  idPrefix: string
  draft: Pick<RecordDraft, Key>
  onChange: (patch: Pick<RecordDraft, Key>) => void
  errors: FieldErrors<Key>
}

/** The big amount field of the forms that register money. */
export function AmountField({
  idPrefix,
  draft,
  onChange,
  errors,
  amountRef,
}: FieldPart<'amount'> & { amountRef?: Ref<HTMLInputElement> }) {
  return (
    <div>
      <label htmlFor={`${idPrefix}-amount`} className="text-[0.9rem] font-medium text-ink-2">
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
          id={`${idPrefix}-amount`}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={draft.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? `${idPrefix}-amount-error` : undefined}
          className="w-full min-w-0 bg-transparent text-[2rem] font-semibold tracking-[-0.02em] placeholder:text-ink-3/60 focus-visible:outline-none"
        />
      </div>
      <FieldError id={`${idPrefix}-amount-error`} errors={errors.amount} />
    </div>
  )
}

/** One Account select; a record that moves money between two Accounts uses it twice. */
export function AccountField({
  id,
  label,
  value,
  accounts,
  errors,
  describedBy,
  optionLabel = (account) => `${account.name}${account.archivedAt === null ? '' : ' (archivada)'}`,
  onChange,
}: {
  id: string
  label: string
  value: number | null
  /** The Accounts the record may name. */
  accounts: Account[]
  errors?: string[]
  /** Ids of other text that explains this field: a note, a hint. */
  describedBy?: string
  optionLabel?: (account: Account) => string
  onChange: (accountId: number) => void
}) {
  const described = [errors ? `${id}-error` : undefined, describedBy].filter(Boolean).join(' ')
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-invalid={Boolean(errors)}
        aria-describedby={described || undefined}
        className={`${fieldClassName} ${borderClassName(Boolean(errors))} mt-1.5`}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {optionLabel(account)}
          </option>
        ))}
      </select>
    </div>
  )
}

/** The Account and the date side by side, with the errors of both under them. */
export function AccountAndDateFields({
  idPrefix,
  draft,
  onChange,
  errors,
  accounts,
  accountNote,
}: RecordFieldProps & {
  /** The Accounts the record may name. */
  accounts: Account[]
  /** Explains the Account when the record already lives on an archived one. */
  accountNote?: string
}) {
  const id = (name: string) => `${idPrefix}-${name}`
  const chosenAccount = accounts.find((account) => account.id === draft.accountId)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 min-[420px]:gap-3">
        <AccountField
          id={id('account')}
          label="Cuenta"
          value={draft.accountId}
          accounts={accounts}
          errors={errors.accountId}
          describedBy={accountNote ? id('account-note') : undefined}
          onChange={(accountId) => onChange({ accountId })}
        />
        <DateField {...{ idPrefix, draft, onChange, errors }} min={chosenAccount?.openingDate} />
      </div>
      {accountNote && (
        <p id={id('account-note')} className="-mt-1 text-[0.87rem] text-ink-3">
          {accountNote}
        </p>
      )}
      <FieldError id={id('account-error')} errors={errors.accountId} />
      <FieldError id={id('date-error')} errors={errors.date} />
    </>
  )
}

/** The day of the record, never past today in Panama. Its error is shown by whoever lays the fields out. */
export function DateField({
  idPrefix,
  draft,
  onChange,
  errors,
  min,
}: FieldPart<'date'> & {
  /** The first day that may be chosen: the start of the Account. */
  min?: string
}) {
  const id = `${idPrefix}-date`
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[0.9rem] font-medium text-ink-2">
        Fecha
      </label>
      <input
        id={id}
        type="date"
        value={draft.date}
        min={min}
        max={todayInPanama()}
        onChange={(event) => onChange({ date: event.target.value })}
        aria-invalid={Boolean(errors.date)}
        aria-describedby={errors.date ? `${id}-error` : undefined}
        className={`${fieldClassName} ${borderClassName(Boolean(errors.date))} mt-1.5`}
      />
    </div>
  )
}

export function DescriptionField({
  idPrefix,
  draft,
  onChange,
  errors,
  placeholder,
}: FieldPart<'description'> & { placeholder: string }) {
  return (
    <div>
      <label htmlFor={`${idPrefix}-description`} className="text-[0.9rem] font-medium text-ink-2">
        Descripción <span className="font-normal text-ink-3">(opcional)</span>
      </label>
      <input
        id={`${idPrefix}-description`}
        value={draft.description}
        onChange={(event) => onChange({ description: event.target.value })}
        autoComplete="off"
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder={placeholder}
        aria-invalid={Boolean(errors.description)}
        aria-describedby={errors.description ? `${idPrefix}-description-error` : undefined}
        className={`${fieldClassName} ${borderClassName(Boolean(errors.description))} mt-1.5 placeholder:text-ink-3`}
      />
      <FieldError id={`${idPrefix}-description-error`} errors={errors.description} />
    </div>
  )
}
