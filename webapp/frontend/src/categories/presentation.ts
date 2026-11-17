import type { Category } from './api'

export const categoriesBack = { to: '/categories', label: 'Categorías' }

/** The Categories screen lists the ones in use first and the archived ones apart. */
export function groupCategories(categories: Category[]) {
  return {
    active: categories.filter((category) => category.archivedAt === null),
    archived: categories.filter((category) => category.archivedAt !== null),
  }
}

/** What happened to a Category; the notice says it in Spanish. */
export type CategoryChange = 'created' | 'renamed' | 'archived' | 'restored' | 'deleted'

const changeNotices: Record<CategoryChange, (name: string) => string> = {
  created: (name) => `Creaste la Categoría ${name}.`,
  renamed: (name) => `Guardaste los cambios de la Categoría ${name}.`,
  archived: (name) => `Archivaste la Categoría ${name}. Sus Gastos y Presupuestos pasados se siguen viendo.`,
  restored: (name) => `Restauraste la Categoría ${name}. Ya puedes usarla en Gastos y Presupuestos nuevos.`,
  deleted: (name) => `Eliminaste la Categoría ${name}.`,
}

export const categoryNotice = (change: CategoryChange, category: Pick<Category, 'name'>) =>
  changeNotices[change](category.name)
