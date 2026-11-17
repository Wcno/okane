import { describe, expect, it } from 'vitest'
import { INITIAL_PREFERENCES, movementFilterOf, type Preferences } from './api'

const preferences = (patch: Partial<Preferences>): Preferences => ({ ...INITIAL_PREFERENCES, ...patch })

describe('movementFilterOf', () => {
  it('starts as the current month, relative to the day it is asked on', () => {
    expect(movementFilterOf(INITIAL_PREFERENCES, '2026-11-16')).toEqual({
      types: [],
      accountId: null,
      from: '2026-11-01',
      to: '2026-11-30',
    })
    expect(movementFilterOf(INITIAL_PREFERENCES, '2028-02-10')).toMatchObject({ from: '2028-02-01', to: '2028-02-29' })
    expect(movementFilterOf(INITIAL_PREFERENCES, '2026-12-31')).toMatchObject({ from: '2026-12-01', to: '2026-12-31' })
  })

  it('leaves the period open for every day', () => {
    expect(movementFilterOf(preferences({ period: 'all' }), '2026-11-16')).toMatchObject({ from: '', to: '' })
  })

  it('keeps the days of a custom period, the type and the Account', () => {
    const chosen = preferences({ period: 'custom', from: '2026-10-05', to: '', movementType: 'income', accountId: 4 })

    expect(movementFilterOf(chosen, '2026-11-16')).toEqual({
      types: ['income'],
      accountId: 4,
      from: '2026-10-05',
      to: '',
    })
  })
})
