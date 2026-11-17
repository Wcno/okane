import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'
import type { RecordPage } from '../lib/useRecordFeed'

/** An Income as api-service describes it. The amount stays a decimal string. */
export interface Income {
  id: number
  amount: string
  accountId: number
  date: string
  description: string
}

/** What registering or correcting an Income sends: every field, the date included. */
export type IncomeInput = Omit<Income, 'id'>

export type IncomeField = 'amount' | 'accountId' | 'date' | 'description'
export type IncomeErrors = FieldErrors<IncomeField>

const LIST_FAILED = 'Okane no pudo consultar tus ingresos. Espera un momento e inténtalo de nuevo.'
const INCOME_GONE = 'Este ingreso ya no existe. Vuelve a tus ingresos para ver la lista al día.'
const INCOME_OR_ACCOUNT_GONE =
  'No encontramos este ingreso o la Cuenta elegida. Vuelve a tus ingresos para ver la lista al día.'

const INCOMES_PAGE_SIZE = 50

interface IncomeBody {
  id: number
  amount: string
  account_id: number
  date: string
  description: string
}

const toIncome = (body: IncomeBody): Income => ({
  id: body.id,
  amount: body.amount,
  accountId: body.account_id,
  date: body.date,
  description: body.description,
})

const toBody = (income: IncomeInput) => ({
  amount: income.amount,
  account_id: income.accountId,
  date: income.date,
  description: income.description,
})

const FORM_FIELDS: Record<string, IncomeField> = {
  amount: 'amount',
  account_id: 'accountId',
  date: 'date',
  description: 'description',
}

export async function listIncomes(page: number, pageSize = INCOMES_PAGE_SIZE): Promise<RecordPage<Income>> {
  const body = await readJson<{ results: IncomeBody[]; total: number; next_page: number | null }>(
    `/api/incomes?page_size=${pageSize}&page=${page}`,
    { failed: LIST_FAILED },
  )
  return { records: body.results.map(toIncome), total: body.total, nextPage: body.next_page }
}

/** One Income; throws NotFoundError when it is not the User's or no longer exists. */
export async function getIncome(id: number): Promise<Income> {
  return toIncome(await readJson<IncomeBody>(`/api/incomes/${id}`, { failed: LIST_FAILED, gone: INCOME_GONE }))
}

const readIncome = async (response: Response) => toIncome(await response.json())

export function createIncome(income: IncomeInput, csrfToken: string): Promise<Outcome<Income, IncomeField>> {
  return write({
    method: 'POST',
    path: '/api/incomes',
    csrfToken,
    body: toBody(income),
    fields: FORM_FIELDS,
    gone: 'Esta Cuenta ya no existe. Elige otra para registrar el ingreso.',
    read: readIncome,
  })
}

export function updateIncome(id: number, income: IncomeInput, csrfToken: string): Promise<Outcome<Income, IncomeField>> {
  return write({
    method: 'PUT',
    path: `/api/incomes/${id}`,
    csrfToken,
    body: toBody(income),
    fields: FORM_FIELDS,
    gone: INCOME_OR_ACCOUNT_GONE,
    read: readIncome,
  })
}

export function deleteIncome(id: number, csrfToken: string): Promise<Outcome<void, IncomeField>> {
  return write({
    method: 'DELETE',
    path: `/api/incomes/${id}`,
    csrfToken,
    gone: INCOME_GONE,
    read: async () => undefined,
  })
}
