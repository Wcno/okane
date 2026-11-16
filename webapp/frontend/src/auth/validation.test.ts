import { describe, expect, it } from 'vitest'
import { validateCredentials, validateNewPassword, validatePasswordChange, validateRecoveryEmail } from './validation'

describe('validateRecoveryEmail', () => {
  it('accepts a complete email', () => {
    expect(validateRecoveryEmail(' ana@ejemplo.com ')).toEqual({})
  })

  it('asks for an email with an example when it is empty or malformed', () => {
    for (const email of ['', 'ana.ejemplo.com']) {
      expect(validateRecoveryEmail(email)).toEqual({
        email: ['Escribe tu correo completo, por ejemplo ana@ejemplo.com.'],
      })
    }
  })
})

describe('validateNewPassword', () => {
  it('accepts a password of ten characters', () => {
    expect(validateNewPassword('diez-letra')).toEqual({})
  })

  it('asks for the new password when it is empty', () => {
    expect(validateNewPassword('')).toEqual({ password: ['Escribe tu contraseña nueva.'] })
  })

  it('tells how many characters are missing', () => {
    expect(validateNewPassword('nueve-let')).toEqual({
      password: ['La contraseña debe tener al menos 10 caracteres. Te falta 1.'],
    })
  })
})

describe('validatePasswordChange', () => {
  it('accepts the current password with a new one of ten characters', () => {
    expect(validatePasswordChange({ currentPassword: 'x', newPassword: 'diez-letra' })).toEqual({})
  })

  it('asks for the current password and explains a short new one', () => {
    expect(validatePasswordChange({ currentPassword: '', newPassword: 'corta12' })).toEqual({
      currentPassword: ['Escribe tu contraseña actual.'],
      newPassword: ['La contraseña debe tener al menos 10 caracteres. Te faltan 3.'],
    })
  })
})

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
      password: ['Escribe la contraseña de tu usuario.'],
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
