import { describe, expect, it } from 'vitest'
import { parseAmount, parsePositiveAmount, parseQuantity } from './amount'

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

describe('parseQuantity', () => {
  it('keeps up to eight decimals exactly and drops trailing zeros', () => {
    expect(parseQuantity('0.12345678')).toEqual({ quantity: '0.12345678' })
    expect(parseQuantity(' 2,50 ')).toEqual({ quantity: '2.5' })
    expect(parseQuantity('007')).toEqual({ quantity: '7' })
  })

  it('rejects zero, signs, exponents and a ninth decimal', () => {
    for (const text of ['0', '0.000', '-1', '1e3', '1.123456789', '', 'abc']) {
      expect(parseQuantity(text)).toEqual({ error: 'invalid' })
    }
  })

  it('rejects more than twelve integer digits as too large', () => {
    expect(parseQuantity('1000000000000')).toEqual({ error: 'too-large' })
    expect(parseQuantity('999999999999.99999999')).toEqual({ quantity: '999999999999.99999999' })
  })
})

describe('parsePositiveAmount', () => {
  it('reads a positive amount, with a comma or a point', () => {
    expect(parsePositiveAmount('12.5')).toEqual({ amount: '12.50' })
    expect(parsePositiveAmount(' 12,50 ')).toEqual({ amount: '12.50' })
    expect(parsePositiveAmount('0.01')).toEqual({ amount: '0.01' })
    expect(parsePositiveAmount('999999999999.99')).toEqual({ amount: '999999999999.99' })
  })

  it('refuses zero, a negative amount and what is not an amount', () => {
    for (const text of ['', '0', '0.00', '-5', '12.505', 'abc', '1,250.00']) {
      expect(parsePositiveAmount(text), text).toEqual({ error: 'invalid' })
    }
  })

  it('says an amount past twelve integer digits is too large', () => {
    expect(parsePositiveAmount('9999999999999')).toEqual({ error: 'too-large' })
  })
})
