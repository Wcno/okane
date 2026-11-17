import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../../accounts/api'
import { DESCRIPTION_MAX_LENGTH } from '../../expenses/form'
import type { RecurringPayment, RecurringPaymentField, RecurringPaymentInput } from '../../recurringPayments/api'
import type { RecurringPaymentDraft } from '../../recurringPayments/form'
import { useRecurringPaymentForm } from '../../recurringPayments/useRecurringPaymentForm'
import type { Outcome } from '../../lib/http'
import { primaryButtonClassName, secondaryButtonClassName } from '../buttons'
import { AmountField, CategoryPicker, FieldError, borderClassName, fieldClassName } from '../expenses/fieldParts'
import { FormAlert } from '../FormAlert'
import { cardClassName } from '../screen/Screen'

/** The card with the form that creates or corrects one rule; Create and Edit differ in what they pass. */
export function RecurringPaymentEditor({
  idPrefix,
  initial,
  accounts,
  save,
  onSaved,
  submitLabel,
  submittingLabel,
  cancelTo,
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
  cancelTo: string
  accountNote?: string
  /** Extra content below the buttons, such as the way to the delete screen. */
  children?: ReactNode
}) {
  const { form, draft, change, errors, isSubmitting, submit } = useRecurringPaymentForm({
    initial,
    accounts,
    save,
    onSaved,
  })
  const id = (name: string) => `${idPrefix}-${name}`
  const accountDescribedBy = [errors.accountId ? id('account-error') : undefined, accountNote ? id('account-note') : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={`${cardClassName} max-w-[34rem]`}>
      <form ref={form} onSubmit={submit} noValidate className="space-y-5">
        {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

        <AmountField id={id} value={draft.amount} onChange={(amount) => change({ amount })} errors={errors.amount} />

        <CategoryPicker
          id={id}
          value={draft.categoryId}
          onChange={(categoryId) => change({ categoryId })}
          errors={errors.categoryId}
        />

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

        <div>
          <label htmlFor={id('description')} className="text-[0.9rem] font-medium text-ink-2">
            Descripción <span className="font-normal text-ink-3">(opcional)</span>
          </label>
          <input
            id={id('description')}
            value={draft.description}
            onChange={(event) => change({ description: event.target.value })}
            autoComplete="off"
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Alquiler, internet, seguro"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? id('description-error') : undefined}
            className={`${fieldClassName} ${borderClassName(Boolean(errors.description))} mt-1.5 placeholder:text-ink-3`}
          />
          <FieldError id={id('description-error')} errors={errors.description} />
        </div>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
          <Link to={cancelTo} className={`${secondaryButtonClassName} sm:flex-1`}>
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
      {children}
    </section>
  )
}
