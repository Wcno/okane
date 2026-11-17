import type { Account } from '../../accounts/api'
import type { TransferErrors } from '../../transfers/api'
import type { TransferDraft } from '../../transfers/form'
import { accountOptionLabel, isContribution, startOfRecords } from '../../transfers/presentation'
import { AccountField, AmountField, DateField, DescriptionField, FieldError } from '../record/RecordFields'

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
  const shared = { idPrefix, draft, onChange, errors }
  const destination = accounts.find((account) => account.id === draft.destinationAccountId)

  return (
    <>
      <AmountField {...shared} />

      <div className="space-y-4">
        <div>
          <AccountField
            id={id('source')}
            label="Sale de"
            value={draft.sourceAccountId}
            accounts={accounts}
            errors={errors.sourceAccountId}
            optionLabel={accountOptionLabel}
            onChange={(sourceAccountId) => onChange({ sourceAccountId })}
          />
          <FieldError id={id('source-error')} errors={errors.sourceAccountId} />
        </div>
        <div>
          <AccountField
            id={id('destination')}
            label="Llega a"
            value={draft.destinationAccountId}
            accounts={accounts}
            errors={errors.destinationAccountId}
            describedBy={id('contribution')}
            optionLabel={accountOptionLabel}
            onChange={(destinationAccountId) => onChange({ destinationAccountId })}
          />
          <FieldError id={id('destination-error')} errors={errors.destinationAccountId} />
        </div>
        {/* Always in the page, so a screen reader hears the hint when it appears; empty, it takes no room. */}
        <div id={id('contribution')} aria-live="polite">
          {isContribution(destination) && (
            <p className="text-[0.9rem] text-ink-2">Una transferencia a una Cuenta de inversión es un Aporte.</p>
          )}
        </div>
        {accountNote && <p className="-mt-1 text-[0.87rem] text-ink-3">{accountNote}</p>}
      </div>

      <DateField {...shared} min={startOfRecords(accounts, [draft.sourceAccountId, draft.destinationAccountId])} />
      <FieldError id={id('date-error')} errors={errors.date} />

      <DescriptionField {...shared} placeholder="Ahorro de noviembre, aporte al bróker" />
    </>
  )
}
