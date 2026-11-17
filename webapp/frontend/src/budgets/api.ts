import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'

/**
 * One Category in a month, with or without a Budget. Amounts stay decimal
 * strings. Without a Budget `id`, `amount` and `remaining` are null: the
 * Category only has what it spent and what is committed.
 */
export interface BudgetLine {
  id: number | null
  /** One of the fixed Categories, 1 to 8 (data/categories.ts). */
  categoryId: number
  /** The calendar month, as 2026-11. */
  month: string
  amount: string | null
  spent: string
  /** What recurring payments hold back at the cutoff of the month, savings payments and the carry-over included. */
  committed: string
  /** The part of `committed` that comes from earlier months. */
  carriedOver: string
  /** Budget - spent - committed; negative when the Category is exceeded. */
  remaining: string | null
  exceeded: boolean
}

/** A Category that has a Budget in its month. */
export type Budget = BudgetLine & { id: number; amount: string; remaining: string }

export const hasBudget = (line: BudgetLine): line is Budget => line.id !== null

export interface BudgetMonth {
  month: string
  /** One line for each Category of the catalog. */
  lines: BudgetLine[]
}

export interface BudgetInput {
  categoryId: number
  month: string
  amount: string
}

export type BudgetField = 'categoryId' | 'month' | 'amount'
export type BudgetErrors = FieldErrors<BudgetField>

const LIST_FAILED = 'Okane no pudo consultar tus Presupuestos. Espera un momento e inténtalo de nuevo.'
const BUDGET_GONE = 'Este Presupuesto ya no existe. Vuelve a tus Presupuestos para ver la lista al día.'

export interface BudgetBody {
  id: number | null
  category_id: number
  month: string
  amount: string | null
  spent: string
  committed: string
  carried_over: string
  remaining: string | null
  exceeded: boolean
}

export const toLine = (body: BudgetBody): BudgetLine => ({
  id: body.id,
  categoryId: body.category_id,
  month: body.month,
  amount: body.amount,
  spent: body.spent,
  committed: body.committed,
  carriedOver: body.carried_over,
  remaining: body.remaining,
  exceeded: body.exceeded,
})

const toBudget = (body: BudgetBody) => toLine(body) as Budget

const toBody = (budget: BudgetInput) => ({
  category_id: budget.categoryId,
  month: budget.month,
  amount: budget.amount,
})

const FORM_FIELDS: Record<string, BudgetField> = {
  category_id: 'categoryId',
  month: 'month',
  amount: 'amount',
}

/** Every Category in one month: its Budget, what it spent and what is left. */
export async function getBudgetMonth(month: string): Promise<BudgetMonth> {
  const body = await readJson<{ month: string; results: BudgetBody[] }>(`/api/budgets?month=${month}`, {
    failed: LIST_FAILED,
  })
  return { month: body.month, lines: body.results.map(toLine) }
}

/** One Budget; throws NotFoundError when it is not the User's or no longer exists. */
export async function getBudget(id: number): Promise<Budget> {
  return toBudget(await readJson<BudgetBody>(`/api/budgets/${id}`, { failed: LIST_FAILED, gone: BUDGET_GONE }))
}

const readBudget = async (response: Response) => toBudget(await response.json())

export function createBudget(budget: BudgetInput, csrfToken: string): Promise<Outcome<Budget, BudgetField>> {
  return write({
    method: 'POST',
    path: '/api/budgets',
    csrfToken,
    body: toBody(budget),
    fields: FORM_FIELDS,
    gone: BUDGET_GONE,
    read: readBudget,
  })
}

export function updateBudget(id: number, budget: BudgetInput, csrfToken: string): Promise<Outcome<Budget, BudgetField>> {
  return write({
    method: 'PUT',
    path: `/api/budgets/${id}`,
    csrfToken,
    body: toBody(budget),
    fields: FORM_FIELDS,
    gone: BUDGET_GONE,
    read: readBudget,
  })
}

export function deleteBudget(id: number, csrfToken: string): Promise<Outcome<void, BudgetField>> {
  return write({
    method: 'DELETE',
    path: `/api/budgets/${id}`,
    csrfToken,
    gone: BUDGET_GONE,
    read: async () => undefined,
  })
}
