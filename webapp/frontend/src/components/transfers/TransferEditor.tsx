import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import type { Outcome } from '../../lib/http'
import { useRecordForm } from '../../lib/useRecordForm'
import type { Transfer, TransferField, TransferInput } from '../../transfers/api'
import { validateTransfer, type TransferDraft } from '../../transfers/form'
import { RecordForm } from '../screen/RecordForm'
import { TransferFields } from './TransferFields'

/** The date is checked against the start of both Accounts, so changing either re-judges it. */
const affectedBy = (patch: Partial<TransferDraft>): TransferField[] =>
  'sourceAccountId' in patch || 'destinationAccountId' in patch
    ? ['date', 'sourceAccountId', 'destinationAccountId']
    : []

/** The card with the form that registers or corrects one Transfer; Register and Edit differ in what they pass. */
export function TransferEditor({
  idPrefix,
  initial,
  accounts,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  accountNote,
  children,
}: {
  idPrefix: string
  initial: TransferDraft
  accounts: Account[]
  save: (transfer: TransferInput) => Promise<Outcome<Transfer, TransferField>>
  onSaved: (transfer: Transfer) => void | Promise<void>
  submitLabel: string
  submittingLabel: string
  accountNote?: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useRecordForm<
    TransferDraft,
    TransferField,
    TransferInput,
    Transfer
  >({
    initial,
    validate: (current) => validateTransfer(current, { accounts }),
    affectedBy,
    save,
    onSaved,
  })

  return (
    <RecordForm
      form={form}
      onSubmit={submit}
      formErrors={errors.form}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo="/transfers"
      fields={
        <TransferFields
          idPrefix={idPrefix}
          draft={draft}
          onChange={change}
          errors={errors}
          accounts={accounts}
          accountNote={accountNote}
        />
      }
    >
      {children}
    </RecordForm>
  )
}
