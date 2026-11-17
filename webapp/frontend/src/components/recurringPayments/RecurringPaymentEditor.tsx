import type { ReactNode } from 'react'
import type { Account } from '../../accounts/api'
import type { Outcome } from '../../lib/http'
import { useRecordForm } from '../../lib/useRecordForm'
import type { RecurringPayment, RecurringPaymentField, RecurringPaymentInput } from '../../recurringPayments/api'
import { validateRecurringPayment, type RecurringPaymentDraft } from '../../recurringPayments/form'
import { CategoryField } from '../record/CategoryField'
import { borderClassName, fieldClassName } from '../record/fieldStyles'
import { AmountField, DescriptionField, FieldError } from '../record/RecordFields'
import { RecordEditor } from '../record/RecordEditor'

/** The form that creates or corrects one rule; Create and Edit differ in what they pass. */
export function RecurringPaymentEditor({
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
  initial: RecurringPaymentDraft
  accounts: Account[]
  save: (rule: RecurringPaymentInput) => Promise<Outcome<RecurringPayment, RecurringPaymentField>>
  onSaved: (rule: RecurringPayment) => void | Promise<void>
  submitLabel: string
  submittingLabel: string
  accountNote?: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useRecordForm({
    initial,
    validate: (current) => validateRecurringPayment(current, { accounts }),
    dateDependsOn: ['accountId'],
    save,
    onSaved,
  })
  const id = (name: string) => `${idPrefix}-${name}`
  const accountDescribedBy = [errors.accountId ? id('account-error') : undefined, accountNote ? id('account-note') : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <RecordEditor
      formRef={form}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={errors.form}
      submitLabel={submitLabel}
      submittingLabel={submittingLabel}
      cancelTo="/recurring-payments"
      fields={
        <>
          <AmountField idPrefix={idPrefix} draft={draft} onChange={change} errors={errors} />

          <CategoryField idPrefix={idPrefix} draft={draft} onChange={change} errors={errors} />

          <div>
            <label htmlFor={id('account')} className="text-[0.9rem] font-medium text-ink-2">
              Cuenta
            </label>
            <select
              id={id('account')}
              value={draft.accountId ?? ''}
              onChange={(event) => change({ accountId: Number(event.target.value) })}
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
            {accountNote && (
              <p id={id('account-note')} className="mt-1.5 text-[0.87rem] text-ink-3">
                {accountNote}
              </p>
            )}
            <FieldError id={id('account-error')} errors={errors.accountId} />
          </div>

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 min-[420px]:gap-3">
            <div className="min-w-0">
              <label htmlFor={id('day')} className="text-[0.9rem] font-medium text-ink-2">
                Día del mes
              </label>
              <input
                id={id('day')}
                inputMode="numeric"
                autoComplete="off"
                maxLength={2}
                placeholder="5"
                value={draft.dayOfMonth}
                onChange={(event) => change({ dayOfMonth: event.target.value })}
                aria-invalid={Boolean(errors.dayOfMonth)}
                aria-describedby={[id('day-hint'), errors.dayOfMonth ? id('day-error') : undefined].filter(Boolean).join(' ')}
                className={`${fieldClassName} ${borderClassName(Boolean(errors.dayOfMonth))} mt-1.5`}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor={id('start')} className="text-[0.9rem] font-medium text-ink-2">
                Desde
              </label>
              <input
                id={id('start')}
                type="date"
                value={draft.startDate}
                onChange={(event) => change({ startDate: event.target.value })}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? id('start-error') : undefined}
                className={`${fieldClassName} ${borderClassName(Boolean(errors.startDate))} mt-1.5`}
              />
            </div>
          </div>
          <p id={id('day-hint')} className="-mt-2 text-[0.87rem] text-ink-3">
            Si el mes no tiene ese día, vence el último. Cada mes se reserva el dinero hasta que confirmes el pago.
          </p>
          <FieldError id={id('day-error')} errors={errors.dayOfMonth} />
          <FieldError id={id('start-error')} errors={errors.startDate} />

          <DescriptionField
            idPrefix={idPrefix}
            draft={draft}
            onChange={change}
            errors={errors}
            placeholder="Alquiler, internet, seguro"
          />
        </>
      }
    >
      {children}
    </RecordEditor>
  )
}
