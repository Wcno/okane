import type { Category } from './api'

export const categoriesBack = { to: '/categories', label: 'Categorías' }

/** The Categories screen shows what the User owns apart from the initial catalog and what is archived. */
export function groupCategories(categories: Category[]) {
  return {
    own: categories.filter((category) => category.isCustom && category.archivedAt === null),
    initial: categories.filter((category) => !category.isCustom),
    archived: categories.filter((category) => category.isCustom && category.archivedAt !== null),
  }
}

/** What happened to a Category; the notice says it in Spanish. */
export type CategoryChange = 'created' | 'renamed' | 'archived'

const changeNotices: Record<CategoryChange, (name: string) => string> = {
  created: (name) => `Creaste la Categoría ${name}.`,
  renamed: (name) => `Guardaste los cambios de la Categoría ${name}.`,
  archived: (name) => `Archivaste la Categoría ${name}. Sus Gastos y Presupuestos pasados se siguen viendo.`,
}

export const categoryNotice = (change: CategoryChange, category: Pick<Category, 'name'>) =>
  changeNotices[change](category.name)
