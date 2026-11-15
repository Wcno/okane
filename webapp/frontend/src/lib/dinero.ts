const formato = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const MENOS = '−'

/** Separa un monto en signo, parte entera y centavos, para componer cifras grandes. */
export const partesDeDinero = (monto: number) => {
  const [entero, centavos] = formato.format(Math.abs(monto)).split('.')
  return { signo: monto < 0 ? MENOS : '', entero, centavos }
}

/** `$1,284.60`, `−$312.45`. Con `signo`, los positivos llevan `+`. */
export const dinero = (monto: number, opciones: { signo?: boolean } = {}) => {
  const { signo, entero, centavos } = partesDeDinero(monto)
  const prefijo = signo || (opciones.signo && monto > 0 ? '+' : '')
  return `${prefijo}$${entero}.${centavos}`
}

/** `$9K`, `$12K`: para los ejes de un gráfico. */
export const dineroCompacto = (monto: number) => `$${Math.round(monto / 1000)}K`
