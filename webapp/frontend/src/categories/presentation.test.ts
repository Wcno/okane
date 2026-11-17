import { describe, expect, it } from 'vitest'
import type { Category } from './api'
import { categoryNotice, groupCategories } from './presentation'

const category = (fields: Partial<Category>): Category => ({
  id: 9,
  name: 'Mascotas',
  key: null,
  hasRecords: false,
  archivedAt: null,
  ...fields,
})

describe('groupCategories', () => {
  it('separates the active Categories from the archived ones', () => {
    const initial = category({ id: 1, name: 'Vivienda', key: 'housing' })
    const own = category({ id: 9 })
    const archived = category({ id: 10, archivedAt: '2026-11-16T10:00:00Z' })

    expect(groupCategories([initial, own, archived])).toEqual({ active: [initial, own], archived: [archived] })
  })
})

describe('categoryNotice', () => {
  it('names the Category and says that history stays when archiving', () => {
    expect(categoryNotice('created', { name: 'Mascotas' })).toBe('Creaste la Categoría Mascotas.')
    expect(categoryNotice('deleted', { name: 'Mascotas' })).toBe('Eliminaste la Categoría Mascotas.')
    expect(categoryNotice('archived', { name: 'Mascotas' })).toContain('se siguen viendo')
  })
})
