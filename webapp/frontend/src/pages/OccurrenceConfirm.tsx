import { Ban } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { FieldError, AmountField, borderClassName, fieldClassName } from '../components/expenses/fieldParts'
import { FormAlert } from '../components/FormAlert'
import { OneOccurrenceScreen } from '../components/recurringPayments/OneOccurrenceScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader, cardClassName } from '../components/screen/Screen'
import { categoryById } from '../data/categories'
import { offeredAccounts } from '../expenses/presentation'
import { todayInPanama } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { confirmOccurrence, type RecurringPaymentOccurrence } from '../recurringPayments/api'
import { typedAmount } from '../expenses/form'
import { dueText, recurringPaymentsBack, STATUS_LABELS } from '../recurringPayments/presentation'
import { useAfterRecurringPaymentChange } from '../recurringPayments/useAfterRecurringPaymentChange'
import { useConfirmationForm } from '../recurringPayments/useConfirmationForm'

function AlreadyResolved({ occurrence, name }: { occurrence: RecurringPaymentOccurrence; name: string }) {
  return (
    <>
      <ScreenHeader title="Confirmar pago" back={recurringPaymentsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<CategoryChip categoryId={occurrence.categoryId} />}
            title={name}
            details={`${STATUS_LABELS[occurrence.status]} · ${dueText({ dueDate: occurrence.dueDate, status: 'pending' })}`}
            amount={occurrence.amount}
          />
        }
        message={
          occurrence.status === 'confirmed'
            ? 'Este pago ya se confirmó y su gasto está registrado. No se puede confirmar otra vez.'
            : 'Esta reserva se canceló y su dinero está libre. No se puede confirmar.'
        }
        cancel={{ to: recurringPaymentsBack.to, label: 'Volver a pagos recurrentes' }}
      />
    </>
  )
}

function ConfirmForm({
  occurrence,
  accounts,
  name,
}: {
  occurrence: RecurringPaymentOccurrence
  accounts: Account[]
  name: string
}) {
  const { csrfToken } = useSignedInUser()
  const { afterConfirmation } = useAfterRecurringPaymentChange()
  const offered = offeredAccounts(accounts, occurrence.accountId)
  const { form, draft, change, errors, isSubmitting, submit } = useConfirmationForm({
    initial: { amount: occurrence.amount, accountId: occurrence.accountId, date: todayInPanama() },
    accounts: offered,
    reservedFrom: occurrence.reservedFrom,
    save: (confirmation) => confirmOccurrence(occurrence.id, confirmation, csrfToken),
    onSaved: (_saved, confirmation) => afterConfirmation(name, confirmation),
  })
  const id = (field: string) => `confirm-${field}`
  const chosen = offered.find((account) => account.id === draft.accountId)
  const amount = typedAmount(draft.amount)
  const category = categoryById(occurrence.categoryId).name

  return (
    <>
      <ScreenHeader
        title="Confirmar pago"
        back={recurringPaymentsBack}
        intro="Revisa lo que pagaste de verdad. Al confirmar se registra el gasto y la reserva se libera."
      />
      <section className={`${cardClassName} max-w-[34rem]`}>
        <RecordSummary
          icon={<CategoryChip categoryId={occurrence.categoryId} />}
          title={name}
          details={`${category} · ${dueText(occurrence)}`}
          amount={occurrence.amount}
        />
        <form ref={form} onSubmit={submit} noValidate className="mt-5 space-y-5">
          {errors.form && <FormAlert>{errors.form.join(' ')}</FormAlert>}

          <AmountField id={id} value={draft.amount} onChange={(value) => change({ amount: value })} errors={errors.amount} />

          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 min-[420px]:gap-3">
            <div className="min-w-0">
              <label htmlFor={id('account')} className="text-[0.9rem] font-medium text-ink-2">
                Cuenta
              </label>
              <select
                id={id('account')}
                value={draft.accountId ?? ''}
                onChange={(event) => change({ accountId: Number(event.target.value) })}
                aria-invalid={Boolean(errors.accountId)}
                aria-describedby={errors.accountId ? id('account-error') : undefined}
                className={`${fieldClassName} ${borderClassName(Boolean(errors.accountId))} mt-1.5`}
              >
                {offered.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                    {account.archivedAt !== null && ' (archivada)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor={id('date')} className="text-[0.9rem] font-medium text-ink-2">
                Fecha del pago
              </label>
              <input
                id={id('date')}
                type="date"
                value={draft.date}
                min={[occurrence.reservedFrom, chosen?.openingDate].filter(Boolean).sort().pop() ?? undefined}
                max={todayInPanama()}
                onChange={(event) => change({ date: event.target.value })}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? id('date-error') : undefined}
                className={`${fieldClassName} ${borderClassName(Boolean(errors.date))} mt-1.5`}
              />
            </div>
          </div>
          <FieldError id={id('account-error')} errors={errors.accountId} />
          <FieldError id={id('date-error')} errors={errors.date} />

          <p aria-live="polite" className="text-[0.9rem] text-ink-2">
            {amount !== null &&
              `Se registrará un gasto de ${formatMoney(amount)} en ${category}${chosen ? ` desde ${chosen.name}` : ''}.`}
          </p>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Link to={recurringPaymentsBack.to} className={`${secondaryButtonClassName} sm:flex-1`}>
              Volver
            </Link>
            <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
              {isSubmitting ? 'Confirmando…' : 'Confirmar pago'}
            </button>
          </div>
        </form>

        <div className="mt-5 border-t border-line pt-4">
          <Link
            to={`/recurring-payments/occurrences/${occurrence.id}/cancel`}
            className="-ml-3 inline-flex h-[44px] items-center gap-2 rounded-full px-3 text-[0.95rem] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <Ban size={17} aria-hidden="true" />
            No lo voy a pagar: cancelar esta reserva
          </Link>
        </div>
      </section>
    </>
  )
}

/** Confirms a reservation: the User reviews amount, Account and date, and one Expense is born. */
export function OccurrenceConfirm() {
  return (
    <OneOccurrenceScreen title="Confirmar pago">
      {(occurrence, accounts, name) =>
        occurrence.status === 'pending' || occurrence.status === 'overdue' ? (
          <ConfirmForm key={occurrence.id} occurrence={occurrence} accounts={accounts} name={name} />
        ) : (
          <AlreadyResolved occurrence={occurrence} name={name} />
        )
      }
    </OneOccurrenceScreen>
  )
}
