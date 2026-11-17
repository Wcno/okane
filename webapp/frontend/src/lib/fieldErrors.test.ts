import { describe, expect, it } from 'vitest'
import { withoutErrors } from './fieldErrors'

describe('withoutErrors', () => {
  const errors = { name: ['Falta el nombre.'], type: ['Elige el tipo.'], form: ['No se pudo guardar.'] }

  it('drops the errors of the fields the User changed and keeps the rest', () => {
    expect(withoutErrors(errors, ['name'])).toEqual({ type: ['Elige el tipo.'], form: ['No se pudo guardar.'] })
  })

  it('leaves the errors as they were when none of those fields had one', () => {
    expect(withoutErrors(errors, [])).toBe(errors)
    expect(withoutErrors({}, ['name'])).toEqual({})
  })
})
