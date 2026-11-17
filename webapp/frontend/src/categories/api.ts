import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'

/**
 * A Category of the User: one of the initial catalog (ids 1 to 8, which never
 * change and cannot be edited) or one of their own. Archived ones stay in the
 * list so past Expenses and Budgets can still name them.
 */
export interface Category {
  id: number
  name: string
  isCustom: boolean
  archivedAt: string | null
}

export interface CategoryInput {
  name: string
}

export type CategoryField = 'name'
export type CategoryErrors = FieldErrors<CategoryField>

const LIST_FAILED = 'Okane no pudo consultar tus Categorías. Espera un momento e inténtalo de nuevo.'
const CATEGORY_GONE = 'Esta Categoría ya no existe. Vuelve a tus Categorías para ver la lista al día.'

interface CategoryBody {
  id: number
  name: string
  is_custom: boolean
  archived_at: string | null
}

const toCategory = (body: CategoryBody): Category => ({
  id: body.id,
  name: body.name,
  isCustom: body.is_custom,
  archivedAt: body.archived_at,
})

const readCategory = async (response: Response) => toCategory(await response.json())

const FORM_FIELDS: Record<string, CategoryField> = { name: 'name' }

/** Every Category the User can name, archived ones included. */
export async function listCategories(): Promise<Category[]> {
  const body = await readJson<{ results: CategoryBody[] }>('/api/categories', { failed: LIST_FAILED })
  return body.results.map(toCategory)
}

/** One Category; throws NotFoundError when it is not the User's or no longer exists. */
export async function getCategory(id: number): Promise<Category> {
  return toCategory(await readJson<CategoryBody>(`/api/categories/${id}`, { failed: LIST_FAILED, gone: CATEGORY_GONE }))
}

export function createCategory(input: CategoryInput, csrfToken: string): Promise<Outcome<Category, CategoryField>> {
  return write({
    method: 'POST',
    path: '/api/categories',
    csrfToken,
    body: input,
    fields: FORM_FIELDS,
    gone: CATEGORY_GONE,
    read: readCategory,
  })
}

export function renameCategory(
  id: number,
  input: CategoryInput,
  csrfToken: string,
): Promise<Outcome<Category, CategoryField>> {
  return write({
    method: 'PUT',
    path: `/api/categories/${id}`,
    csrfToken,
    body: input,
    fields: FORM_FIELDS,
    gone: CATEGORY_GONE,
    read: readCategory,
  })
}

/** Archives a Category; api-service refuses while it still has recurring payments or pending reservations. */
export function archiveCategory(id: number, csrfToken: string): Promise<Outcome<Category, CategoryField>> {
  return write({
    method: 'POST',
    path: `/api/categories/${id}/archive`,
    csrfToken,
    gone: CATEGORY_GONE,
    read: readCategory,
  })
}
