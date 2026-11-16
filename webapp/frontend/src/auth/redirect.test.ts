import { describe, expect, it } from 'vitest'
import { afterSignIn } from './redirect'

describe('afterSignIn', () => {
  it('returns to the screen that asked for a session', () => {
    expect(afterSignIn({ from: '/budgets?month=2026-11' })).toBe('/budgets?month=2026-11')
  })

  it('opens the Panel when no screen asked', () => {
    expect(afterSignIn(null)).toBe('/dashboard')
    expect(afterSignIn({})).toBe('/dashboard')
  })

  it('never leaves the application', () => {
    for (const from of ['https://evil.example', '//evil.example', '/\\evil.example', 'dashboard', 42]) {
      expect(afterSignIn({ from })).toBe('/dashboard')
    }
  })

  it('never returns to an authentication screen', () => {
    for (const from of ['/login', '/register', '/logout']) {
      expect(afterSignIn({ from })).toBe('/dashboard')
    }
  })
})
