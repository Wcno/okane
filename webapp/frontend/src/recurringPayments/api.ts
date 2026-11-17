import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'

export type OccurrenceStatus = 'pending' | 'overdue' | 'confirmed' | 'cancelled'

/** One month's reservation of a RecurringPayment. Amounts stay decimal strings. */
export interface RecurringPaymentOccurrence {
  id: number
  recurringPaymentId: number
  dueDate: string
  status: OccurrenceStatus
  amount: string
  accountId: number
  categoryId: number
  /** The rule's description when the reservation was made; empty when it had none. */
  description: string
  /** The day the money began to be reserved. */
  reservedFrom: string
  /** The day the User says the payment happened, or the day it was cancelled; null while open. */
  resolvedOn: string | null
  /** The moment the answer was recorded; null while open. */
  resolvedAt: string | null
  /** The Expense a confirmation created, kept even after that Expense is deleted. */
  expenseId: number | null
}

/** The rule that reserves money every month; its occurrences come embedded. */
export interface RecurringPayment {
  id: number
  description: string
  amount: string
  accountId: number
  categoryId: number
  dayOfMonth: number
  startDate: string
  /** A deleted rule stays in the list only while it has pending occurrences. */
  status: 'active' | 'deleted'
  occurrences: RecurringPaymentOccurrence[]
}

/** What creating or replacing a rule sends. */
export interface RecurringPaymentInput {
  description: string
  amount: string
  accountId: number
  categoryId: number
  dayOfMonth: number
  startDate: string
}

/** What the User reviews when confirming an occurrence. */
export interface Confirmation {
  amount: string
  accountId: number
  date: string
}

export type RecurringPaymentField =
  | 'description'
  | 'amount'
  | 'accountId'
  | 'categoryId'
  | 'dayOfMonth'
  | 'startDate'
export type RecurringPaymentErrors = FieldErrors<RecurringPaymentField>

export type ConfirmationField = 'amount' | 'accountId' | 'date'
export type ConfirmationErrors = FieldErrors<ConfirmationField>

const LIST_FAILED = 'Okane no pudo consultar tus pagos recurrentes. Espera un momento e inténtalo de nuevo.'
const RULE_GONE = 'Este pago recurrente ya no existe. Vuelve a tus pagos recurrentes para ver la lista al día.'
const RULE_OR_ACCOUNT_GONE =
  'No encontramos este pago recurrente o la Cuenta elegida. Vuelve a tus pagos recurrentes para ver la lista al día.'
const OCCURRENCE_GONE = 'Esta reserva ya no existe. Vuelve a tus pagos recurrentes para ver la lista al día.'

const PAGE_SIZE = 50

interface OccurrenceBody {
  id: number
  recurring_payment_id: number
  due_date: string
  status: OccurrenceStatus
  amount: string
  account_id: number
  category_id: number
  description: string
  reserved_from: string
  resolved_on: string | null
  resolved_at: string | null
  expense_id: number | null
}

interface RecurringPaymentBody {
  id: number
  description: string
  amount: string
  account_id: number
  category_id: number
  day_of_month: number
  start_date: string
  status: 'active' | 'deleted'
  occurrences?: OccurrenceBody[]
}

const toOccurrence = (body: OccurrenceBody): RecurringPaymentOccurrence => ({
  id: body.id,
  recurringPaymentId: body.recurring_payment_id,
  dueDate: body.due_date,
  status: body.status,
  amount: body.amount,
  accountId: body.account_id,
  categoryId: body.category_id,
  description: body.description,
  reservedFrom: body.reserved_from,
  resolvedOn: body.resolved_on,
  resolvedAt: body.resolved_at,
  expenseId: body.expense_id,
})

const toRecurringPayment = (body: RecurringPaymentBody): RecurringPayment => ({
  id: body.id,
  description: body.description,
  amount: body.amount,
  accountId: body.account_id,
  categoryId: body.category_id,
  dayOfMonth: body.day_of_month,
  startDate: body.start_date,
  status: body.status,
  occurrences: (body.occurrences ?? []).map(toOccurrence),
})

const toBody = (rule: RecurringPaymentInput) => ({
  description: rule.description,
  amount: rule.amount,
  account_id: rule.accountId,
  category_id: rule.categoryId,
  day_of_month: rule.dayOfMonth,
  start_date: rule.startDate,
})

const RULE_FIELDS: Record<string, RecurringPaymentField> = {
  description: 'description',
  amount: 'amount',
  account_id: 'accountId',
  category_id: 'categoryId',
  day_of_month: 'dayOfMonth',
  start_date: 'startDate',
}

const CONFIRMATION_FIELDS: Record<string, ConfirmationField> = {
  amount: 'amount',
  account_id: 'accountId',
  date: 'date',
}

/** Every rule of the User, reading page after page; the pages are small and the rules few. */
export async function listRecurringPayments(): Promise<RecurringPayment[]> {
  const rules: RecurringPayment[] = []
  let page: number | null = 1
  while (page !== null) {
    const body: { results: RecurringPaymentBody[]; next_page: number | null } = await readJson(
      `/api/recurring-payments?page_size=${PAGE_SIZE}&page=${page}`,
      { failed: LIST_FAILED },
    )
    rules.push(...body.results.map(toRecurringPayment))
    page = body.next_page
  }
  return rules
}

/** One rule; throws NotFoundError when it is not the User's or no longer exists. */
export async function getRecurringPayment(id: number): Promise<RecurringPayment> {
  return toRecurringPayment(
    await readJson<RecurringPaymentBody>(`/api/recurring-payments/${id}`, { failed: LIST_FAILED, gone: RULE_GONE }),
  )
}

/** One occurrence; throws NotFoundError when it is not the User's or no longer exists. */
export async function getOccurrence(id: number): Promise<RecurringPaymentOccurrence> {
  return toOccurrence(
    await readJson<OccurrenceBody>(`/api/recurring-payments/occurrences/${id}`, {
      failed: LIST_FAILED,
      gone: OCCURRENCE_GONE,
    }),
  )
}

const readRule = async (response: Response) => toRecurringPayment(await response.json())
const readOccurrence = async (response: Response) => toOccurrence(await response.json())

export function createRecurringPayment(
  rule: RecurringPaymentInput,
  csrfToken: string,
): Promise<Outcome<RecurringPayment, RecurringPaymentField>> {
  return write({
    method: 'POST',
    path: '/api/recurring-payments',
    csrfToken,
    body: toBody(rule),
    fields: RULE_FIELDS,
    gone: 'Esta Cuenta ya no existe. Elige otra para el pago recurrente.',
    read: readRule,
  })
}

export function updateRecurringPayment(
  id: number,
  rule: RecurringPaymentInput,
  csrfToken: string,
): Promise<Outcome<RecurringPayment, RecurringPaymentField>> {
  return write({
    method: 'PUT',
    path: `/api/recurring-payments/${id}`,
    csrfToken,
    body: toBody(rule),
    fields: RULE_FIELDS,
    gone: RULE_OR_ACCOUNT_GONE,
    read: readRule,
  })
}

export function deleteRecurringPayment(id: number, csrfToken: string): Promise<Outcome<void, RecurringPaymentField>> {
  return write({
    method: 'DELETE',
    path: `/api/recurring-payments/${id}`,
    csrfToken,
    gone: RULE_GONE,
    read: async () => undefined,
  })
}

export function confirmOccurrence(
  id: number,
  confirmation: Confirmation,
  csrfToken: string,
): Promise<Outcome<RecurringPaymentOccurrence, ConfirmationField>> {
  return write({
    method: 'POST',
    path: `/api/recurring-payments/occurrences/${id}/confirm`,
    csrfToken,
    body: { amount: confirmation.amount, account_id: confirmation.accountId, date: confirmation.date },
    fields: CONFIRMATION_FIELDS,
    gone: 'No encontramos esta reserva o la Cuenta elegida. Vuelve a tus pagos recurrentes para ver la lista al día.',
    read: readOccurrence,
  })
}

export function cancelOccurrence(
  id: number,
  csrfToken: string,
): Promise<Outcome<RecurringPaymentOccurrence, ConfirmationField>> {
  return write({
    method: 'POST',
    path: `/api/recurring-payments/occurrences/${id}/cancel`,
    csrfToken,
    gone: OCCURRENCE_GONE,
    read: readOccurrence,
  })
}
