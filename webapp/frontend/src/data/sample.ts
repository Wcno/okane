// Datos de ejemplo para desarrollar la interfaz mientras `api-service` no existe.
// Ninguna cifra derivada se escribe a mano: el Disponible, el Restante y el
// Patrimonio se calculan aquí con las reglas del glosario, para que la pantalla
// muestre números que cuadran entre sí.

export type TipoCuenta = 'gastos' | 'ahorro' | 'inversion'

export interface Cuenta {
  id: string
  nombre: string
  tipo: TipoCuenta
  saldo: number
}

export interface Posicion {
  simbolo: string
  nombre: string
  unidades: number
  precioReferencia: number
}

export interface PagoRecurrente {
  id: string
  nombre: string
  categoria: string
  monto: number
  dia: number
}

export interface LineaPresupuesto {
  categoria: string
  /** `null` cuando la Categoría no tiene Presupuesto este mes. */
  presupuesto: number | null
  gastado: number
}

export interface PuntoPatrimonio {
  mes: string
  patrimonio: number
  ahorroNeto: number
  rendimiento: number
}

/** Lo que cambia al registrar un Gasto. El resto de los datos de ejemplo es fijo. */
export interface Estado {
  cuentas: Cuenta[]
  presupuestos: LineaPresupuesto[]
}

export const hoy = { dia: 15, mes: 'noviembre', mesCorto: 'nov', anio: 2026, diasDelMes: 30 }

export const estadoInicial: Estado = {
  cuentas: [
    { id: 'corriente', nombre: 'Cuenta corriente', tipo: 'gastos', saldo: 1284.6 },
    { id: 'tarjeta', nombre: 'Tarjeta de crédito', tipo: 'gastos', saldo: -312.45 },
    { id: 'ahorro', nombre: 'Ahorro', tipo: 'ahorro', saldo: 4150 },
    { id: 'broker', nombre: 'Bróker', tipo: 'inversion', saldo: 186.2 },
  ],
  presupuestos: [
    { categoria: 'Vivienda', presupuesto: 650, gastado: 650 },
    { categoria: 'Alimentación', presupuesto: 320, gastado: 214.35 },
    { categoria: 'Transporte', presupuesto: 140, gastado: 71.2 },
    { categoria: 'Servicios', presupuesto: 130, gastado: 18.9 },
    { categoria: 'Salud', presupuesto: 80, gastado: 12 },
    { categoria: 'Entretenimiento', presupuesto: 90, gastado: 118.4 },
    { categoria: 'Educación', presupuesto: 60, gastado: 0 },
    { categoria: 'Otros', presupuesto: null, gastado: 23.5 },
  ],
}

export const posiciones: Posicion[] = [
  { simbolo: 'VOO', nombre: 'Vanguard S&P 500 ETF', unidades: 6.5, precioReferencia: 512.4 },
  { simbolo: 'BTC', nombre: 'Bitcoin', unidades: 0.042, precioReferencia: 68450 },
]

export const pagosRecurrentes: PagoRecurrente[] = [
  { id: 'alquiler', nombre: 'Alquiler', categoria: 'Vivienda', monto: 650, dia: 1 },
  { id: 'internet', nombre: 'Internet', categoria: 'Servicios', monto: 42.75, dia: 18 },
  { id: 'luz', nombre: 'Luz', categoria: 'Servicios', monto: 58, dia: 22 },
  { id: 'gimnasio', nombre: 'Gimnasio', categoria: 'Salud', monto: 35, dia: 25 },
  { id: 'seguro', nombre: 'Seguro del auto', categoria: 'Transporte', monto: 64.5, dia: 28 },
]

export const ingresosDelMes = 1650

/** Patrimonio al cierre de mayo; cada mes siguiente suma Ahorro neto y Rendimiento. */
const patrimonioAlCierreDeMayo = 9120.4

const mesesCerrados = [
  { mes: 'jun', ahorroNeto: 380, rendimiento: 74.7 },
  { mes: 'jul', ahorroNeto: 410.2, rendimiento: -94.55 },
  { mes: 'ago', ahorroNeto: 362.4, rendimiento: 149.15 },
  { mes: 'sep', ahorroNeto: 295.1, rendimiento: 62.5 },
  { mes: 'oct', ahorroNeto: 318.45, rendimiento: -41.2 },
]

export const sumar = (valores: number[]) =>
  Math.round(valores.reduce((total, valor) => total + valor, 0) * 100) / 100

export const diasRestantes = hoy.diasDelMes - hoy.dia

export const pagosPorVencer = pagosRecurrentes.filter((pago) => pago.dia > hoy.dia)

/** Comprometido: Pagos recurrentes del mes que aún no han vencido. */
export const comprometido = sumar(pagosPorVencer.map((pago) => pago.monto))

export const comprometidoPorCategoria = (categoria: string) =>
  sumar(pagosPorVencer.filter((pago) => pago.categoria === categoria).map((pago) => pago.monto))

export const saldoCuentasDeGastos = (estado: Estado) =>
  sumar(estado.cuentas.filter((cuenta) => cuenta.tipo === 'gastos').map((cuenta) => cuenta.saldo))

/** Disponible: Saldos de las Cuentas de gastos menos lo Comprometido. */
export const disponible = (estado: Estado) => sumar([saldoCuentasDeGastos(estado), -comprometido])

/** Restante: Presupuesto menos lo gastado y menos lo Comprometido de la Categoría. */
export const restante = (linea: LineaPresupuesto) =>
  linea.presupuesto === null
    ? null
    : sumar([linea.presupuesto, -linea.gastado, -comprometidoPorCategoria(linea.categoria)])

export const gastosDelMes = (estado: Estado) =>
  sumar(estado.presupuestos.map((linea) => linea.gastado))

export const valorPosicion = (posicion: Posicion) =>
  Math.round(posicion.unidades * posicion.precioReferencia * 100) / 100

export const valorPosiciones = sumar(posiciones.map(valorPosicion))

/** Patrimonio: Saldos de todas las Cuentas más el valor de todas las Posiciones. */
export const patrimonio = (estado: Estado) =>
  sumar([...estado.cuentas.map((cuenta) => cuenta.saldo), valorPosiciones])

/** Serie mensual del Patrimonio, del cierre de mayo al día de hoy. */
export const evolucion = (estado: Estado): PuntoPatrimonio[] => {
  const serie: PuntoPatrimonio[] = [
    { mes: 'may', patrimonio: patrimonioAlCierreDeMayo, ahorroNeto: 0, rendimiento: 0 },
  ]
  for (const mes of mesesCerrados) {
    const anterior = serie[serie.length - 1].patrimonio
    serie.push({ ...mes, patrimonio: sumar([anterior, mes.ahorroNeto, mes.rendimiento]) })
  }
  const cierreAnterior = serie[serie.length - 1].patrimonio
  const actual = patrimonio(estado)
  const ahorroNeto = sumar([ingresosDelMes, -gastosDelMes(estado)])
  // Lo que la variación del Patrimonio no debe al Ahorro neto es Rendimiento.
  const rendimiento = sumar([actual, -cierreAnterior, -ahorroNeto])
  serie.push({ mes: hoy.mesCorto, patrimonio: actual, ahorroNeto, rendimiento })
  return serie
}

/** Cuentas desde las que puede salir un Gasto: la de inversión es cerrada. */
export const cuentasParaGastos = (estado: Estado) =>
  estado.cuentas.filter((cuenta) => cuenta.tipo !== 'inversion')

export const registrarGasto = (
  estado: Estado,
  gasto: { monto: number; categoria: string; cuentaId: string },
): Estado => ({
  cuentas: estado.cuentas.map((cuenta) =>
    cuenta.id === gasto.cuentaId ? { ...cuenta, saldo: sumar([cuenta.saldo, -gasto.monto]) } : cuenta,
  ),
  presupuestos: estado.presupuestos.map((linea) =>
    linea.categoria === gasto.categoria
      ? { ...linea, gastado: sumar([linea.gastado, gasto.monto]) }
      : linea,
  ),
})
