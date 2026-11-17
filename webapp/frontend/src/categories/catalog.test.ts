import { CarFront, Tag } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { categoryById, categoryByName, findCategory, isOffered, setCatalog } from './catalog'
import { initialCatalog } from '../test/initialCatalog'

const mascotas = { id: 9, name: 'Mascotas', key: null, hasRecords: false, archivedAt: null }

describe('catalog', () => {
  it('names a Category by id with the icon and hue of its key', () => {
    expect(categoryById(3)).toMatchObject({ name: 'Transporte', icon: CarFront, tone: 'var(--cat-3)' })
  })

  it('draws an own Category with the tag and the neutral hue', () => {
    setCatalog([...initialCatalog, mascotas])

    expect(categoryById(9)).toMatchObject({ name: 'Mascotas', icon: Tag, tone: 'var(--cat-0)' })
    expect(categoryByName('Mascotas').id).toBe(9)
  })

  it('keeps an archived Category named for history but does not offer it', () => {
    const archived = { ...mascotas, archivedAt: '2026-11-16T10:00:00Z' }
    setCatalog([...initialCatalog, archived])

    expect(categoryById(9).name).toBe('Mascotas')
    expect(findCategory(9) && isOffered(findCategory(9)!)).toBe(false)
  })

  it('draws a Category it does not know in the neutral hue', () => {
    expect(categoryById(77)).toMatchObject({ id: 77, tone: 'var(--cat-0)' })
  })
})
