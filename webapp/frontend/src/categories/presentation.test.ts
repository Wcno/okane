import { describe, expect, it } from 'vitest'
import type { Category } from './api'
import { categoryNotice, groupCategories } from './presentation'

const category = (fields: Partial<Category>): Category => ({
  id: 9,
  name: 'Mascotas',
  isCustom: true,
  archivedAt: null,
  ...fields,
})

describe('groupCategories', () => {
  it('separates the initial catalog, the own Categories and the archived ones', () => {
    const initial = category({ id: 1, name: 'Vivienda', isCustom: false })
    const own = category({ id: 9 })
    const archived = category({ id: 10, archivedAt: '2026-11-16T10:00:00Z' })

    expect(groupCategories([initial, own, archived])).toEqual({
      initial: [initial],
      own: [own],
      archived: [archived],
    })
  })
})

describe('categoryNotice', () => {
  it('names the Category and says that history stays when archiving', () => {
    expect(categoryNotice('created', { name: 'Mascotas' })).toBe('Creaste la Categoría Mascotas.')
    expect(categoryNotice('archived', { name: 'Mascotas' })).toContain('se siguen viendo')
  })
})
