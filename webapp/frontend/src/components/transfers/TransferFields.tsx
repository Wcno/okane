import type { Account } from '../../accounts/api'
import { DESCRIPTION_MAX_LENGTH, type TransferDraft } from '../../transfers/form'
import type { TransferErrors } from '../../transfers/api'
import { accountOptionLabel, isContribution } from '../../transfers/presentation'
import { AmountField, DateField, DescriptionField, FieldError } from '../screen/fields'
import { borderClassName, fieldClassName } from '../screen/fieldStyles'

function AccountSelect({
  id,
  label,
  value,
  accounts,
  errors,
  describedBy,
  onChange,
}: {
  id: string
  label: string
  value: number | null
  accounts: Account[]
  errors?: string[]
  describedBy?: string
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
            {accountOptionLabel(account)}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  )
}

/** The fields of a Transfer: amount, the two Accounts, date and description. */
export function TransferFields({
  idPrefix,
  draft,
  onChange,
  errors,
  accounts,
  accountNote,
}: {
  idPrefix: string
  draft: TransferDraft
  onChange: (patch: Partial<TransferDraft>) => void
  errors: TransferErrors
  /** The Accounts the Transfer may name. */
  accounts: Account[]
  /** Explains the Accounts when the Transfer already lives on an archived one. */
  accountNote?: string
}) {
  const id = (name: string) => `${idPrefix}-${name}`
  const destination = accounts.find((account) => account.id === draft.destinationAccountId)
  const startOfRecords = [draft.sourceAccountId, draft.destinationAccountId]
    .map((accountId) => accounts.find((account) => account.id === accountId)?.openingDate)
    .filter((day): day is string => day !== undefined)
    .sort()
    .at(-1)

  return (
    <>
      <AmountField
        id={id('amount')}
        value={draft.amount}
        onChange={(amount) => onChange({ amount })}
        errors={errors.amount}
      />

      <div className="space-y-4">
        <AccountSelect
          id={id('source')}
          label="Sale de"
          value={draft.sourceAccountId}
          accounts={accounts}
          errors={errors.sourceAccountId}
          onChange={(sourceAccountId) => onChange({ sourceAccountId })}
        />
        <AccountSelect
          id={id('destination')}
          label="Llega a"
          value={draft.destinationAccountId}
          accounts={accounts}
          errors={errors.destinationAccountId}
          describedBy={id('contribution')}
          onChange={(destinationAccountId) => onChange({ destinationAccountId })}
        />
        {/* Always in the page, so a screen reader hears the hint when it appears; empty, it takes no room. */}
        <div id={id('contribution')} aria-live="polite">
          {isContribution(destination) && (
            <p className="text-[0.9rem] text-ink-2">Una transferencia a una Cuenta de inversión es un Aporte.</p>
          )}
        </div>
        {accountNote && <p className="-mt-1 text-[0.87rem] text-ink-3">{accountNote}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <DateField
          id={id('date')}
          value={draft.date}
          min={startOfRecords}
          onChange={(date) => onChange({ date })}
          errors={errors.date}
        />
        <FieldError id={id('date-error')} errors={errors.date} />
      </div>

      <DescriptionField
        id={id('description')}
        value={draft.description}
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder="Ahorro de noviembre, aporte al bróker"
        onChange={(description) => onChange({ description })}
        errors={errors.description}
      />
    </>
  )
}
