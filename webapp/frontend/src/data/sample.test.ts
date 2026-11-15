import { describe, expect, it } from 'vitest'
import {
  comprometido,
  cuentasParaGastos,
  disponible,
  estadoInicial,
  evolucion,
  patrimonio,
  registrarGasto,
  restante,
  saldoCuentasDeGastos,
  type Estado,
} from './sample'

const lineaDe = (estado: Estado, categoria: string) => {
  const linea = estado.presupuestos.find((candidata) => candidata.categoria === categoria)
  if (!linea) throw new Error(`No hay línea de presupuesto para ${categoria}`)
  return linea
}

const saldoDe = (estado: Estado, cuentaId: string) => {
  const cuenta = estado.cuentas.find((candidata) => candidata.id === cuentaId)
  if (!cuenta) throw new Error(`No existe la cuenta ${cuentaId}`)
  return cuenta.saldo
}

describe('Disponible', () => {
  it('es el Saldo de las Cuentas de gastos menos lo Comprometido', () => {
    expect(saldoCuentasDeGastos(estadoInicial)).toBe(972.15)
    expect(comprometido).toBe(200.25)
    expect(disponible(estadoInicial)).toBe(771.9)
  })

  it('resta el Saldo negativo de una tarjeta de crédito', () => {
    const sinTarjeta: Estado = {
      ...estadoInicial,
      cuentas: estadoInicial.cuentas.filter((cuenta) => cuenta.id !== 'tarjeta'),
    }
    expect(disponible(sinTarjeta) - disponible(estadoInicial)).toBeCloseTo(312.45, 2)
  })

  it('no cuenta las Cuentas de ahorro ni de inversión', () => {
    const soloGastos: Estado = {
      ...estadoInicial,
      cuentas: estadoInicial.cuentas.filter((cuenta) => cuenta.tipo === 'gastos'),
    }
    expect(disponible(soloGastos)).toBe(disponible(estadoInicial))
  })
})

describe('Restante', () => {
  it('descuenta lo gastado y lo Comprometido de la Categoría', () => {
    // 140.00 de Presupuesto, 71.20 gastados y 64.50 del seguro por vencer.
    expect(restante(lineaDe(estadoInicial, 'Transporte'))).toBe(4.3)
  })

  it('es negativo cuando la Categoría está excedida', () => {
    expect(restante(lineaDe(estadoInicial, 'Entretenimiento'))).toBe(-28.4)
  })

  it('no existe para una Categoría sin Presupuesto', () => {
    expect(restante(lineaDe(estadoInicial, 'Otros'))).toBeNull()
  })
})

describe('registrar un Gasto', () => {
  const gasto = { monto: 12.5, categoria: 'Alimentación', cuentaId: 'corriente' }
  const despues = registrarGasto(estadoInicial, gasto)

  it('baja el Saldo de la Cuenta usada y deja las demás intactas', () => {
    expect(saldoDe(despues, 'corriente')).toBe(1272.1)
    expect(saldoDe(despues, 'tarjeta')).toBe(saldoDe(estadoInicial, 'tarjeta'))
    expect(saldoDe(despues, 'ahorro')).toBe(saldoDe(estadoInicial, 'ahorro'))
  })

  it('baja el Disponible y el Restante de su Categoría en el mismo monto', () => {
    expect(disponible(despues)).toBe(759.4)
    expect(restante(lineaDe(despues, 'Alimentación'))).toBe(93.15)
    expect(restante(lineaDe(despues, 'Transporte'))).toBe(4.3)
  })

  it('se acepta aunque exceda el Presupuesto o deje el Saldo en negativo', () => {
    const grande = registrarGasto(estadoInicial, { ...gasto, monto: 2000 })
    expect(restante(lineaDe(grande, 'Alimentación'))).toBe(-1894.35)
    expect(saldoDe(grande, 'corriente')).toBe(-715.4)
  })

  it('no modifica el estado anterior', () => {
    expect(saldoDe(estadoInicial, 'corriente')).toBe(1284.6)
    expect(lineaDe(estadoInicial, 'Alimentación').gastado).toBe(214.35)
  })

  it('no puede salir de una Cuenta de inversión', () => {
    expect(cuentasParaGastos(estadoInicial).map((cuenta) => cuenta.tipo)).not.toContain('inversion')
  })
})

describe('Patrimonio', () => {
  it('es la suma de los Saldos de todas las Cuentas más el valor de las Posiciones', () => {
    expect(patrimonio(estadoInicial)).toBe(11513.85)
  })

  it('su variación mensual se explica por completo con Ahorro neto y Rendimiento', () => {
    const serie = evolucion(estadoInicial)
    for (let indice = 1; indice < serie.length; indice += 1) {
      const variacion = serie[indice].patrimonio - serie[indice - 1].patrimonio
      expect(serie[indice].ahorroNeto + serie[indice].rendimiento).toBeCloseTo(variacion, 2)
    }
  })

  it('un Gasto reduce el Ahorro neto del mes y no toca el Rendimiento', () => {
    const antes = evolucion(estadoInicial).at(-1)!
    const despues = evolucion(
      registrarGasto(estadoInicial, { monto: 40, categoria: 'Salud', cuentaId: 'corriente' }),
    ).at(-1)!
    expect(despues.ahorroNeto).toBeCloseTo(antes.ahorroNeto - 40, 2)
    expect(despues.rendimiento).toBeCloseTo(antes.rendimiento, 2)
    expect(despues.patrimonio).toBeCloseTo(antes.patrimonio - 40, 2)
  })
})
