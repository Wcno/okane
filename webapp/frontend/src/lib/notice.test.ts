import { describe, expect, it } from 'vitest'
import { noticeFrom } from './notice'

describe('noticeFrom', () => {
  it('reads the notice a screen was sent with', () => {
    expect(noticeFrom({ notice: 'Creaste Ahorro.' })).toBe('Creaste Ahorro.')
  })

  it('says nothing for a navigation without one', () => {
    for (const state of [null, undefined, 'x', 3, {}, { notice: 4 }]) expect(noticeFrom(state)).toBeNull()
  })
})
