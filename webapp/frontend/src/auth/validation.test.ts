import { describe, expect, it } from 'vitest'
import { validateCredentials } from './validation'

describe('validateCredentials', () => {
  it('accepts a complete login', () => {
    expect(validateCredentials('login', { email: 'ana@ejemplo.com', password: 'x' })).toEqual({})
  })

  it('asks for an email with an example when it is empty or malformed', () => {
    for (const email of ['', '   ', 'ana.ejemplo.com', 'ana@']) {
      expect(validateCredentials('login', { email, password: 'x' })).toEqual({
        email: ['Escribe tu correo completo, por ejemplo ana@ejemplo.com.'],
      })
    }
  })

  it('asks for the password when it is empty', () => {
    expect(validateCredentials('login', { email: 'ana@ejemplo.com', password: '' })).toEqual({
      password: ['Escribe tu contraseña.'],
    })
  })

  it('does not check the length of a login password', () => {
    expect(validateCredentials('login', { email: 'ana@ejemplo.com', password: 'corta' })).toEqual({})
  })

  it('tells a new user how many characters the password is missing', () => {
    expect(validateCredentials('register', { email: 'ana@ejemplo.com', password: 'corta12' })).toEqual({
      password: ['La contraseña debe tener al menos 10 caracteres. Te faltan 3.'],
    })
  })

  it('accepts a new password of ten characters', () => {
    expect(validateCredentials('register', { email: 'ana@ejemplo.com', password: 'diez-letra' })).toEqual({})
  })
})
