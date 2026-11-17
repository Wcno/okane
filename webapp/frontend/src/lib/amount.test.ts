import { describe, expect, it } from 'vitest'
import { parseAmount } from './amount'

describe('parseAmount', () => {
  it('reads an exact amount in cents as the decimal string the API takes', () => {
    expect(parseAmount('12.5')).toEqual({ amount: '12.50' })
    expect(parseAmount('007')).toEqual({ amount: '7.00' })
    expect(parseAmount('999999999999.99')).toEqual({ amount: '999999999999.99' })
  })

  it('takes a comma as the decimal separator', () => {
    expect(parseAmount(' 12,5 ')).toEqual({ amount: '12.50' })
  })

  it('keeps the sign, with either minus character, and never a negative zero', () => {
    expect(parseAmount('-312.45')).toEqual({ amount: '-312.45' })
    expect(parseAmount('−312,45')).toEqual({ amount: '-312.45' })
    expect(parseAmount('-0')).toEqual({ amount: '0.00' })
  })

  it('refuses what is not an amount with at most two decimals', () => {
    for (const text of ['', ' ', 'abc', '1e3', '12.505', '1,250.00', '1.', '.5', '--5']) {
      expect(parseAmount(text), text).toEqual({ error: 'invalid' })
    }
  })

  it('tells an amount past twelve integer digits apart from a bad one', () => {
    for (const text of ['1000000000000', '1234567890123.45', '-1000000000000']) {
      expect(parseAmount(text), text).toEqual({ error: 'too-large' })
    }
  })
})
