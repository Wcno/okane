import { RequestError, readJson, write, type FieldErrors, type Outcome } from '../lib/http'

/** An Expense as api-service describes it. The amount stays a decimal string. */
export interface Expense {
  id: number
  amount: string
  /** One of the fixed Categories, 1 to 8 (data/categories.ts). */
  categoryId: number
  accountId: number
  date: string
  description: string
}

/** What registering or correcting an Expense sends: every field, the date included. */
export type ExpenseInput = Omit<Expense, 'id'>

export type ExpenseField = 'amount' | 'categoryId' | 'accountId' | 'date' | 'description'
export type ExpenseErrors = FieldErrors<ExpenseField>

export interface ExpensePage {
  expenses: Expense[]
  total: number
  nextPage: number | null
  /** The Account of the Expense registered last, by order of registration. */
  lastUsedAccountId: number | null
}

const LIST_FAILED = 'Okane no pudo consultar tus gastos. Espera un momento e inténtalo de nuevo.'
const EXPENSE_GONE = 'Este gasto ya no existe. Vuelve a tus gastos para ver la lista al día.'
const EXPENSE_OR_ACCOUNT_GONE =
  'No encontramos este gasto o la Cuenta elegida. Vuelve a tus gastos para ver la lista al día.'

const EXPENSES_PAGE_SIZE = 50

interface ExpenseBody {
  id: number
  amount: string
  category_id: number
  account_id: number
  date: string
  description: string
}

const toExpense = (body: ExpenseBody): Expense => ({
  id: body.id,
  amount: body.amount,
  categoryId: body.category_id,
  accountId: body.account_id,
  date: body.date,
  description: body.description,
})

const toBody = (expense: ExpenseInput) => ({
  amount: expense.amount,
  category_id: expense.categoryId,
  account_id: expense.accountId,
  date: expense.date,
  description: expense.description,
})

const FORM_FIELDS: Record<string, ExpenseField> = {
  amount: 'amount',
  category_id: 'categoryId',
  account_id: 'accountId',
  date: 'date',
  description: 'description',
}

export async function listExpenses(page: number, pageSize = EXPENSES_PAGE_SIZE): Promise<ExpensePage> {
  const body = await readJson<{
    results: ExpenseBody[]
    total: number
    next_page: number | null
    last_used_account_id: number | null
  }>(`/api/expenses?page_size=${pageSize}&page=${page}`, { failed: LIST_FAILED })
  return {
    expenses: body.results.map(toExpense),
    total: body.total,
    nextPage: body.next_page,
    lastUsedAccountId: body.last_used_account_id,
  }
}

/** The Account the quick form proposes; none when the question cannot be answered. */
export async function lastUsedAccountId(): Promise<number | null> {
  try {
    return (await listExpenses(1, 1)).lastUsedAccountId
  } catch (error) {
    if (error instanceof RequestError) return null
    throw error
  }
}

/** One Expense; throws NotFoundError when it is not the User's or no longer exists. */
export async function getExpense(id: number): Promise<Expense> {
  return toExpense(await readJson<ExpenseBody>(`/api/expenses/${id}`, { failed: LIST_FAILED, gone: EXPENSE_GONE }))
}

const readExpense = async (response: Response) => toExpense(await response.json())

export function createExpense(expense: ExpenseInput, csrfToken: string): Promise<Outcome<Expense, ExpenseField>> {
  return write({
    method: 'POST',
    path: '/api/expenses',
    csrfToken,
    body: toBody(expense),
    fields: FORM_FIELDS,
    gone: 'Esta Cuenta ya no existe. Elige otra para registrar el gasto.',
    read: readExpense,
  })
}

export function updateExpense(id: number, expense: ExpenseInput, csrfToken: string): Promise<Outcome<Expense, ExpenseField>> {
  return write({
    method: 'PUT',
    path: `/api/expenses/${id}`,
    csrfToken,
    body: toBody(expense),
    fields: FORM_FIELDS,
    gone: EXPENSE_OR_ACCOUNT_GONE,
    read: readExpense,
  })
}

export function deleteExpense(id: number, csrfToken: string): Promise<Outcome<void, ExpenseField>> {
  return write({
    method: 'DELETE',
    path: `/api/expenses/${id}`,
    csrfToken,
    gone: EXPENSE_GONE,
    read: async () => undefined,
  })
}
