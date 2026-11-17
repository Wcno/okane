import { useSyncExternalStore } from 'react'
import { iconOf, toneOf } from './appearance'
import { listCategories, type Category } from './api'

/** A Category with what is needed to draw it. */
export interface CategoryView extends Category {
  icon: ReturnType<typeof iconOf>
  /** CSS variable of its hue; it follows the Category's identity, not its place in a list. */
  tone: string
}

let catalog: Category[] = []
const listeners = new Set<() => void>()

/** Replaces the Categories every screen names; the app shell loads them before it shows a screen. */
export function setCatalog(categories: Category[]) {
  catalog = categories
  listeners.forEach((listener) => listener())
}

/** Reads the Categories again, after the User created, renamed or archived one. */
export async function reloadCatalog() {
  setCatalog(await listCategories())
}

/** The Categories the User can name, archived ones included, so history keeps its names. */
export const useCatalog = (): Category[] =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => catalog,
  )

const view = (category: Category): CategoryView => ({
  ...category,
  icon: iconOf(category.key),
  tone: toneOf(category.key),
})

const UNKNOWN: Category = { id: 0, name: 'Sin Categoría', key: null, hasRecords: false, archivedAt: null }

export const findCategory = (id: number | null): Category | undefined =>
  catalog.find((category) => category.id === id)

/** A Category that is gone from the list still draws, neutral, instead of breaking its screen. */
export const categoryById = (id: number): CategoryView => view(findCategory(id) ?? { ...UNKNOWN, id })

export const categoryByName = (name: string): CategoryView =>
  view(catalog.find((category) => category.name === name) ?? UNKNOWN)

/** The Categories a new Expense, Budget or recurring payment may use. */
export const isOffered = (category: Category) => category.archivedAt === null
