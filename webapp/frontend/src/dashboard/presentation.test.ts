import { describe, expect, it } from 'vitest'
import { daysLeftText, percentOf, perDaySentence } from './presentation'

describe('perDaySentence', () => {
  it('says what Disponible allows per day for the days left', () => {
    expect(perDaySentence({ available: '550.00', perDay: '36.66', daysLeft: 15 })).toBe(
      'Son $36.66 por día durante los 15 días que quedan del mes, hoy incluido.',
    )
  })

  it('names the last day, which divides by one', () => {
    expect(perDaySentence({ available: '75.00', perDay: '75.00', daysLeft: 1 })).toBe(
      'Son $75.00 para hoy, el último día del mes.',
    )
  })

  it('explains a negative Disponible instead of showing a negative allowance', () => {
    expect(perDaySentence({ available: '-300.00', perDay: '-20.00', daysLeft: 15 })).toBe(
      'Lo Comprometido supera el Saldo de tus Cuentas de gastos por $300.00. Quedan 15 días del mes, hoy incluido.',
    )
  })
})

describe('daysLeftText', () => {
  it('handles the last day of the month', () => {
    expect(daysLeftText(1)).toBe('Hoy es el último día del mes')
  })
})

describe('percentOf', () => {
  it('is the share for a bar, kept inside 0 to 100', () => {
    expect(percentOf('200.00', '800.00')).toBe(25)
    expect(percentOf('900.00', '800.00')).toBe(100)
    expect(percentOf('-5.00', '800.00')).toBe(0)
  })

  it('is zero without a positive whole', () => {
    expect(percentOf('10.00', '0.00')).toBe(0)
    expect(percentOf('10.00', '-4.00')).toBe(0)
  })
})
