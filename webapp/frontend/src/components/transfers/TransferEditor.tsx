import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import type { Outcome } from '../../lib/http'
import { useRecordForm } from '../../lib/useRecordForm'
import type { Transfer, TransferField, TransferInput } from '../../transfers/api'
import { validateTransfer, type TransferDraft } from '../../transfers/form'
import { RecordEditor } from '../record/RecordEditor'
import { TransferFields } from './TransferFields'

/** The card with the form that registers or corrects one Transfer; Register and Edit differ in what they pass. */
export function TransferEditor({
  initial,
  accounts,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  accountNote,
  children,
}: {
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
    dateDependsOn: ['sourceAccountId', 'destinationAccountId'],
    save,
    onSaved,
  })

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo="/transfers"
      fields={
        <TransferFields
          idPrefix="transfer"
          draft={draft}
          onChange={change}
          errors={errors}
          accounts={accounts}
          accountNote={accountNote}
        />
      }
    >
      {children}
    </RecordEditor>
  )
}
