import { Ban } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useSignedInUser } from '../auth/context'
import { primaryButtonClassName, secondaryButtonClassName } from '../components/buttons'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { AccountAndDateFields, AmountField } from '../components/record/RecordFields'
import { FormAlert } from '../components/FormAlert'
import { OneOccurrenceScreen } from '../components/recurringPayments/OneRecurringPaymentScreen'
import { ConfirmCard, RecordSummary } from '../components/screen/ConfirmCard'
import { ScreenHeader, cardClassName } from '../components/screen/Screen'
import { categoryById } from '../categories/catalog'
import { offeredAccounts } from '../accounts/presentation'
import { todayInPanama } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { confirmOccurrence, getOccurrence, type RecurringPaymentOccurrence } from '../recurringPayments/api'
import { typedAmount } from '../lib/amount'
import { useRecordForm } from '../lib/useRecordForm'
import { dueText, occurrenceTitle, recurringPaymentsBack, STATUS_LABELS } from '../recurringPayments/presentation'
import { useAfterRecurringPaymentChange } from '../recurringPayments/useAfterRecurringPaymentChange'
import { validateConfirmation, type ConfirmationDraft } from '../recurringPayments/form'

function AlreadyResolved({ occurrence, name }: { occurrence: RecurringPaymentOccurrence; name: string }) {
  return (
    <>
      <ScreenHeader title="Confirmar pago" back={recurringPaymentsBack} />
      <ConfirmCard
        summary={
          <RecordSummary
            icon={<CategoryChip categoryId={occurrence.categoryId} />}
            title={name}
            details={`${STATUS_LABELS[occurrence.status]} · ${dueText(occurrence)}`}
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

function ConfirmForm({ occurrence, accounts }: { occurrence: RecurringPaymentOccurrence; accounts: Account[] }) {
  const { csrfToken } = useSignedInUser()
  const { afterConfirmation } = useAfterRecurringPaymentChange()
  const name = occurrenceTitle(occurrence)
  const offered = offeredAccounts(accounts, occurrence.accountId)
  const initial: ConfirmationDraft = { amount: occurrence.amount, accountId: occurrence.accountId, date: todayInPanama() }
  const { form, draft, change, errors, isSubmitting, submit } = useRecordForm({
    initial,
    validate: (current) =>
      validateConfirmation(current, { accounts: offered, reservedFrom: occurrence.reservedFrom }),
    dateDependsOn: ['accountId'],
    // The notice names what was really paid, which the occurrence does not carry back.
    save: async (confirmation) => {
      const outcome = await confirmOccurrence(occurrence.id, confirmation, csrfToken)
      return outcome.ok ? { ok: true as const, value: { confirmation } } : outcome
    },
    onSaved: ({ confirmation }) => afterConfirmation(name, confirmation),
  })
  const formError = errors.form?.join(' ')
  // A refusal may mean another tab answered the reservation: then it cannot be confirmed any more.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!formError) return
    getOccurrence(occurrence.id).then(
      (current) => setSettled(current.status === 'confirmed' || current.status === 'cancelled'),
      () => undefined,
    )
  }, [formError, occurrence.id])
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

          <AmountField idPrefix="confirm" draft={draft} onChange={change} errors={errors} />
          <AccountAndDateFields idPrefix="confirm" draft={draft} onChange={change} errors={errors} accounts={offered} />

          <p aria-live="polite" className="text-[0.9rem] text-ink-2">
            {amount !== null &&
              `Se registrará un gasto de ${formatMoney(amount)} en ${category}${chosen ? ` desde ${chosen.name}` : ''}.`}
          </p>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Link to={recurringPaymentsBack.to} className={`${secondaryButtonClassName} sm:flex-1`}>
              {settled ? 'Volver a pagos recurrentes' : 'Volver'}
            </Link>
            {!settled && (
              <button type="submit" disabled={isSubmitting} className={`${primaryButtonClassName} sm:flex-[1.6]`}>
                {isSubmitting ? 'Confirmando…' : 'Confirmar pago'}
              </button>
            )}
          </div>
        </form>

        {!settled && (
        <div className="mt-5 border-t border-line pt-4">
          <Link
            to={`/recurring-payments/occurrences/${occurrence.id}/cancel`}
            className="-ml-3 inline-flex h-[44px] items-center gap-2 rounded-full px-3 text-[0.95rem] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
          >
            <Ban size={17} aria-hidden="true" />
            No lo voy a pagar: cancelar esta reserva
          </Link>
        </div>
        )}
      </section>
    </>
  )
}

/** Confirms a reservation: the User reviews amount, Account and date, and one Expense is born. */
export function OccurrenceConfirm() {
  return (
    <OneOccurrenceScreen title="Confirmar pago">
      {(occurrence, accounts) =>
        occurrence.status === 'pending' || occurrence.status === 'overdue' ? (
          <ConfirmForm key={occurrence.id} occurrence={occurrence} accounts={accounts} />
        ) : (
          <AlreadyResolved occurrence={occurrence} name={occurrenceTitle(occurrence)} />
        )
      }
    </OneOccurrenceScreen>
  )
}
