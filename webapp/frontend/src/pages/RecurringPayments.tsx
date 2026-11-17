import { Repeat } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { Account } from '../accounts/api'
import { useAccounts } from '../accounts/useAccounts'
import { CategoryChip } from '../components/expenses/CategoryChip'
import { RecordRow } from '../components/screen/RecordRow'
import { EmptyState, NoticeBanner, Pending, ScreenHeader, cardClassName } from '../components/screen/Screen'
import { offeredAccounts } from '../accounts/presentation'
import { useExpenseRevision } from '../expenses/revision'
import { formatMoney } from '../lib/money'
import { noticeFrom } from '../lib/notice'
import { useLoaded } from '../lib/useLoaded'
import { listRecurringPayments, type RecurringPayment, type RecurringPaymentOccurrence } from '../recurringPayments/api'
import {
  NEEDS_AN_ACCOUNT_FOR_RULES,
  STATUS_LABELS,
  allOccurrences,
  describeRule,
  occurrenceTitle,
  dueText,
  resolved,
  unresolved,
} from '../recurringPayments/presentation'

interface Names {
  account: (id: number) => string | undefined
  rule: (occurrence: RecurringPaymentOccurrence) => string
}

function PendingRow({ occurrence, names }: { occurrence: RecurringPaymentOccurrence; names: Names }) {
  const title = names.rule(occurrence)
  const account = names.account(occurrence.accountId)
  const status = STATUS_LABELS[occurrence.status]
  const due = dueText(occurrence)

  return (
    <RecordRow
      id={`occurrence-${occurrence.id}`}
      to={`/recurring-payments/occurrences/${occurrence.id}/confirm`}
      label={`Revisar pago ${title}, ${formatMoney(occurrence.amount)}, ${status.toLowerCase()}, ${due.toLowerCase()}`}
      icon={<CategoryChip categoryId={occurrence.categoryId} />}
      title={title}
      details={[due, account].filter(Boolean).join(' · ')}
      amount={occurrence.amount}
    />
  )
}

function ResolvedRow({ occurrence, names }: { occurrence: RecurringPaymentOccurrence; names: Names }) {
  const account = names.account(occurrence.accountId)
  return (
    <li className="flex min-h-[56px] items-center gap-3 py-3">
      <CategoryChip categoryId={occurrence.categoryId} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-[1rem] font-medium">{names.rule(occurrence)}</span>
        <span className="mt-0.5 block break-words text-[0.87rem] leading-snug text-ink-3">
          {[STATUS_LABELS[occurrence.status], dueText(occurrence), account]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </span>
      <span
        className={`shrink-0 text-[1rem] font-semibold tabular-nums ${occurrence.status === 'cancelled' ? 'text-ink-3 line-through' : ''}`}
      >
        {formatMoney(occurrence.amount)}
      </span>
    </li>
  )
}

function Rules({ rules, accounts }: { rules: RecurringPayment[]; accounts: Account[] }) {
  const names = new Map(accounts.map((account) => [account.id, account.name]))
  const occurrences = allOccurrences(rules)
  const lookup: Names = { account: (id) => names.get(id), rule: occurrenceTitle }
  const active = rules.filter((rule) => rule.status === 'active')
  const toConfirm = unresolved(occurrences)
  const answered = resolved(occurrences)

  return (
    <div className="max-w-[44rem] space-y-4 lg:space-y-5">
      {toConfirm.length > 0 && (
        <section aria-labelledby="to-confirm" className={cardClassName}>
          <h2 id="to-confirm" className="text-[1rem] font-medium text-ink-2">
            Por confirmar
          </h2>
          <p className="mt-1 text-[0.87rem] text-ink-3">
            Este dinero está reservado. Confirma cada pago cuando lo hagas para registrar el gasto.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {toConfirm.map((occurrence) => (
              <PendingRow key={occurrence.id} occurrence={occurrence} names={lookup} />
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section aria-labelledby="rules" className={cardClassName}>
          <h2 id="rules" className="text-[1rem] font-medium text-ink-2">
            Tus pagos recurrentes
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {active.map((rule) => {
              const { title, details } = describeRule(rule, names.get(rule.accountId))
              return (
                <RecordRow
                  key={rule.id}
                  to={`/recurring-payments/${rule.id}/edit`}
                  label={`Editar pago recurrente ${title}, ${formatMoney(rule.amount)}`}
                  icon={<CategoryChip categoryId={rule.categoryId} />}
                  title={title}
                  details={details}
                  amount={rule.amount}
                />
              )
            })}
          </ul>
        </section>
      )}

      {answered.length > 0 && (
        <section aria-labelledby="answered" className={cardClassName}>
          <h2 id="answered" className="text-[1rem] font-medium text-ink-2">
            Ya resueltos
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {answered.map((occurrence) => (
              <ResolvedRow key={occurrence.id} occurrence={occurrence} names={lookup} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** The User's rules and the reservations waiting for a confirmation. */
export function RecurringPayments() {
  const revision = useExpenseRevision()
  const { state, retry } = useLoaded(listRecurringPayments, revision)
  const accounts = useAccounts()
  const location = useLocation()
  const notice = noticeFrom(location.state)
  const known = accounts.state.status === 'ready' ? accounts.state.value : []
  const canCreate = accounts.state.status !== 'ready' || offeredAccounts(known).length > 0

  return (
    <>
      <ScreenHeader
        title="Pagos recurrentes"
        intro="Reserva cada mes el dinero de tus pagos fijos. El gasto se registra cuando confirmas que lo pagaste."
        action={
          state.status === 'ready' && state.value.length > 0 && canCreate
            ? { to: '/recurring-payments/create', label: 'Nuevo pago' }
            : undefined
        }
      />

      <NoticeBanner notice={notice} className="max-w-[44rem]" />

      {state.status !== 'ready' ? (
        <Pending state={state} retry={retry} loading="Cargando tus pagos recurrentes…" />
      ) : state.value.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Aún no tienes pagos recurrentes"
          text={
            canCreate
              ? 'Crea el alquiler, un servicio o una suscripción: el monto, su Categoría, la Cuenta y el día del mes. Okane reserva ese dinero cada mes hasta que confirmes el pago.'
              : NEEDS_AN_ACCOUNT_FOR_RULES
          }
          action={
            canCreate
              ? { to: '/recurring-payments/create', label: 'Crear tu primer pago recurrente' }
              : { to: '/accounts/create', label: 'Crear tu primera cuenta' }
          }
        />
      ) : (
        <Rules rules={state.value} accounts={known} />
      )}
    </>
  )
}
