import { readJson, write, type FieldErrors, type Outcome } from '../lib/http'

/**
 * A Category of the User, theirs to rename, archive or delete. `key` says which of the
 * initial eight a copy is (it fixes its icon and hue) and is null for the ones they
 * created. Archived ones stay in the list so past Expenses and Budgets can still name them.
 */
export interface Category {
  id: number
  name: string
  key: string | null
  /** An Expense, Budget or recurring payment refers to it: deleting it archives it instead. */
  hasRecords: boolean
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
  key: string | null
  has_records: boolean
  archived_at: string | null
}

const toCategory = (body: CategoryBody): Category => ({
  id: body.id,
  name: body.name,
  key: body.key,
  hasRecords: body.has_records,
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

/** What deleting a Category did: removed it, or archived it because records refer to it. */
export type Removal = { result: 'deleted' } | { result: 'archived'; category: Category }

/** Deletes a Category without records; api-service archives one that has them, once its rules are resolved. */
export function deleteCategory(id: number, csrfToken: string): Promise<Outcome<Removal, CategoryField>> {
  return write({
    method: 'DELETE',
    path: `/api/categories/${id}`,
    csrfToken,
    gone: CATEGORY_GONE,
    read: async (response): Promise<Removal> => {
      if (response.status === 204) return { result: 'deleted' }
      return { result: 'archived', category: await readCategory(response) }
    },
  })
}
