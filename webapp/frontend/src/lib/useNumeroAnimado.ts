import { useEffect, useRef, useState } from 'react'

/**
 * Lleva una cifra hasta su nuevo valor en lugar de saltar, para que se vea qué
 * cambió al registrar un movimiento. Con movimiento reducido, salta.
 */
export function useNumeroAnimado(valor: number, duracion = 520) {
  const [mostrado, setMostrado] = useState(valor)
  const actual = useRef(valor)

  useEffect(() => {
    const inicio = actual.current
    if (inicio === valor) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      actual.current = valor
      setMostrado(valor)
      return
    }

    let cuadro = 0
    const comienzo = performance.now()
    const paso = (ahora: number) => {
      const progreso = Math.min(1, (ahora - comienzo) / duracion)
      const suavizado = 1 - Math.pow(1 - progreso, 4)
      actual.current = progreso === 1 ? valor : inicio + (valor - inicio) * suavizado
      setMostrado(actual.current)
      if (progreso < 1) cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [valor, duracion])

  return mostrado
}
