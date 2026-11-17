import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validatePrice } from './priceForm'

describe('validatePrice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-16T15:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('accepts a positive price with a day that is not in the future', () => {
    expect(validatePrice({ value: '187,35', date: '2026-11-16' })).toEqual({
      ok: true,
      price: { value: '187.35', date: '2026-11-16' },
    })
  })

  it('keeps up to eight decimals', () => {
    expect(validatePrice({ value: '0.12345678', date: '2026-11-01' })).toMatchObject({ ok: true })
    expect(validatePrice({ value: '0.123456789', date: '2026-11-01' })).toMatchObject({ ok: false })
  })

  it.each(['', '0', 'abc', '-3'])('refuses %j as a price', (value) => {
    const outcome = validatePrice({ value, date: '2026-11-16' })
    expect(outcome.ok).toBe(false)
    expect(outcome.ok === false && outcome.errors.value).toHaveLength(1)
  })

  it('refuses a future or a missing day', () => {
    expect(validatePrice({ value: '5', date: '2026-11-17' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
    expect(validatePrice({ value: '5', date: '' })).toMatchObject({ ok: false, errors: { date: [expect.any(String)] } })
  })
})
