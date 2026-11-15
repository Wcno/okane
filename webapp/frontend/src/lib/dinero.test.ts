import { describe, expect, it } from 'vitest'
import { dinero, dineroCompacto, partesDeDinero } from './dinero'

describe('dinero', () => {
  it('separa miles con coma y siempre muestra dos decimales', () => {
    expect(dinero(1284.6)).toBe('$1,284.60')
    expect(dinero(0)).toBe('$0.00')
  })

  it('pone el signo menos antes del símbolo', () => {
    expect(dinero(-312.45)).toBe('−$312.45')
  })

  it('con signo, marca los positivos y no el cero', () => {
    expect(dinero(541.65, { signo: true })).toBe('+$541.65')
    expect(dinero(-64.95, { signo: true })).toBe('−$64.95')
    expect(dinero(0, { signo: true })).toBe('$0.00')
  })
})

describe('partesDeDinero', () => {
  it('separa la parte entera de los centavos para componer cifras grandes', () => {
    expect(partesDeDinero(771.9)).toEqual({ signo: '', entero: '771', centavos: '90' })
    expect(partesDeDinero(-11513.85)).toEqual({ signo: '−', entero: '11,513', centavos: '85' })
  })
})

describe('dineroCompacto', () => {
  it('abrevia en miles para los ejes de un gráfico', () => {
    expect(dineroCompacto(9000)).toBe('$9K')
    expect(dineroCompacto(12000)).toBe('$12K')
  })
})
