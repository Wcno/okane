import { describe, expect, it } from 'vitest'
import { validateCategory } from './form'

describe('validateCategory', () => {
  it('trims and collapses the spaces of the name', () => {
    expect(validateCategory({ name: '  Mis   mascotas ' })).toEqual({ ok: true, value: { name: 'Mis mascotas' } })
  })

  it('asks for a name', () => {
    const outcome = validateCategory({ name: '   ' })

    expect(outcome).toEqual({ ok: false, errors: { name: ['Escribe el nombre de la Categoría.'] } })
  })

  it('refuses a name past 40 characters', () => {
    const outcome = validateCategory({ name: 'x'.repeat(41) })

    expect(outcome.ok).toBe(false)
    expect(validateCategory({ name: 'x'.repeat(40) }).ok).toBe(true)
  })
})
